/**
 * Loan API Routes
 *
 * POST /api/loans - Create a new loan (Admin/Manager only)
 * GET /api/loans - List loans with filtering and pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminOrManager, canAccessCustomer } from "@/lib/auth";
import { calculateInstallmentAmount, calculateTotalInterest, validateLoanTerms } from "@/lib/payments";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { queueGenerateEMISchedule } from "@/lib/queue";
import { cacheDelPattern } from "@/lib/cache";

// Validation schemas
const createLoanSchema = z.object({
  customerId: z.string().cuid(),
  principal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  interestRate: z.string().regex(/^\d+(\.\d{1,3})?$/, "Invalid interest rate"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"]),
  customPeriodDays: z.number().int().positive().optional(),
  tenureInstallments: z.number().int().positive(),
  startDate: z.string().datetime().optional(),
  charges: z
    .array(
      z.object({
        type: z.enum(["STAMP_DUTY", "DOCUMENT_FEE", "PROCESSING_FEE", "OTHER"]),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      })
    )
    .optional(),
  firstInstallmentPaid: z.boolean().optional(),
  remarks: z.string().optional(),
});

/**
 * POST /api/loans - Create new loan
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await getSessionUserFromRequest(request);
    if (!user || !isAdminOrManager(user)) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins and managers can create loans." },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createLoanSchema.parse(body);

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Validate loan terms
    const loanTerms = {
      principal: validatedData.principal,
      annualInterestPercent: validatedData.interestRate,
      tenureInstallments: validatedData.tenureInstallments,
      frequency: validatedData.frequency,
      customPeriodDays: validatedData.customPeriodDays,
    };

    const validation = validateLoanTerms(loanTerms);
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid loan terms", details: validation.errors }, { status: 400 });
    }

    // Calculate loan amounts
    const principal = new Decimal(validatedData.principal);
    const installmentAmount = calculateInstallmentAmount(
      validatedData.principal,
      validatedData.interestRate,
      validatedData.tenureInstallments,
      validatedData.frequency,
      validatedData.customPeriodDays
    );
    const totalInterest = calculateTotalInterest(
      validatedData.principal,
      validatedData.interestRate,
      validatedData.tenureInstallments,
      validatedData.frequency,
      validatedData.customPeriodDays
    );
    const totalAmount = principal.plus(totalInterest);

    // Calculate charges and disbursed amount
    const charges = validatedData.charges || [];
    const totalCharges = charges.reduce(
      (acc, c) => acc.plus(new Decimal(c.amount)),
      new Decimal(0)
    );
    const disbursedAmount = principal.minus(totalCharges);

    // Validate disbursed amount is positive
    if (disbursedAmount.lte(0)) {
      return NextResponse.json(
        { error: "Charges cannot exceed principal amount" },
        { status: 400 }
      );
    }

    // Calculate start and end dates
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();

    // Create loan in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create loan
      const loan = await tx.loan.create({
        data: {
          customerId: validatedData.customerId,
          createdById: user.id,
          principal: validatedData.principal,
          interestRate: validatedData.interestRate,
          frequency: validatedData.frequency,
          customPeriodDays: validatedData.customPeriodDays,
          tenureInInstallments: validatedData.tenureInstallments,
          installmentAmount: installmentAmount.toString(),
          totalInterest: totalInterest.toString(),
          totalAmount: totalAmount.toString(),
          disbursedAmount: disbursedAmount.toString(),
          firstInstallmentPaid: validatedData.firstInstallmentPaid || false,
          status: "PENDING", // Loan created but not yet disbursed
          startDate,
          outstandingPrincipal: validatedData.principal,
          outstandingInterest: totalInterest.toString(),
          remarks: validatedData.remarks,
        },
      });

      // Create loan charges
      if (charges.length > 0) {
        await tx.loanCharge.createMany({
          data: charges.map((charge) => ({
            loanId: loan.id,
            type: charge.type,
            amount: charge.amount,
          })),
        });
      }

      return loan;
    });

    // Create audit log
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      userId: user.id,
      action: "LOAN_CREATED",
      entityType: "Loan",
      entityId: result.id,
      afterData: result,
      ...clientInfo,
      remarks: `Loan created for customer ${customer.user.name} (${customer.user.email})`,
    });

    // Clear customer cache
    await cacheDelPattern(`loans:customer:${validatedData.customerId}*`);
    await cacheDelPattern(`dashboard:*`);

    // Queue EMI schedule generation (async)
    await queueGenerateEMISchedule(result.id);

    return NextResponse.json(
      {
        message: "Loan created successfully",
        loan: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Loan creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create loan", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/loans - List loans with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Max 100
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: any = {};

    if (user.role === "AGENT") {
      // Agents can only see loans for their assigned customers
      const assignments = await prisma.agentAssignment.findMany({
        where: { agentId: user.id, isActive: true },
        select: { customerId: true },
      });
      where.customerId = { in: assignments.map((a) => a.customerId) };
    } else if (user.role === "CUSTOMER") {
      // Customers can only see their own loans
      const customer = await prisma.customer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
      }
      where.customerId = customer.id;
    }
    // Admins and Managers can see all loans

    // Apply filters
    if (customerId) {
      // Verify access to customer
      const hasAccess = await canAccessCustomer(user.id, customerId);
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this customer" }, { status: 403 });
      }
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    // Fetch loans with pagination
    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          charges: true,
          _count: {
            select: { collections: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.loan.count({ where }),
    ]);

    // Serialize loans data (convert Decimal and Date to strings)
    const serializedLoans = loans.map((loan) => {
      try {
        return {
          id: loan.id,
          loanNumber: loan.loanNumber,
          customerId: loan.customerId,
          principal: loan.principal?.toString() || "0",
          interestRate: loan.interestRate?.toString() || "0",
          status: loan.status,
          frequency: loan.frequency,
          tenureInInstallments: loan.tenureInInstallments,
          installmentAmount: loan.installmentAmount?.toString() || "0",
          disbursedAmount: loan.disbursedAmount?.toString() || "0",
          totalCollected: loan.totalCollected?.toString() || "0",
          outstandingPrincipal: loan.outstandingPrincipal?.toString() || "0",
          outstandingInterest: loan.outstandingInterest?.toString() || "0",
          createdAt: loan.createdAt.toISOString(),
          customer: {
            id: loan.customer.id,
            user: {
              id: loan.customer.user.id,
              name: loan.customer.user.name,
              email: loan.customer.user.email,
              phone: loan.customer.user.phone,
            },
          },
          _count: loan._count,
        };
      } catch (err) {
        console.error("Error serializing loan:", loan.id, err);
        throw err;
      }
    });

    return NextResponse.json({
      loans: serializedLoans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Loan list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch loans", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
