/**
 * Collection API Routes
 *
 * POST /api/collections - Record a new collection (Agent/Manager/Admin)
 * GET /api/collections - List collections with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, canAccessLoan } from "@/lib/auth";
import { allocateCollection } from "@/lib/payments";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { cacheDelPattern } from "@/lib/cache";

// Validation schemas
const createCollectionSchema = z.object({
  loanId: z.string().cuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  collectionDate: z.string().datetime().optional(),
  paymentMethod: z.string().optional(),
  remarks: z.string().optional(),
});

/**
 * POST /api/collections - Record a new collection
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCollectionSchema.parse(body);

    // Verify access to loan
    const hasAccess = await canAccessLoan(user.id, validatedData.loanId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied. You cannot record collections for this loan." },
        { status: 403 }
      );
    }

    // Fetch loan details
    const loan = await prisma.loan.findUnique({
      where: { id: validatedData.loanId },
      include: {
        customer: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Cannot record collection for ${loan.status.toLowerCase()} loan` },
        { status: 400 }
      );
    }

    // Validate collection amount
    const collectionAmount = new Decimal(validatedData.amount);
    if (collectionAmount.lte(0)) {
      return NextResponse.json({ error: "Collection amount must be positive" }, { status: 400 });
    }

    const outstandingTotal = new Decimal(loan.outstandingPrincipal).plus(
      new Decimal(loan.outstandingInterest)
    );

    if (collectionAmount.gt(outstandingTotal)) {
      return NextResponse.json(
        {
          error: "Collection amount exceeds outstanding balance",
          outstanding: outstandingTotal.toString(),
        },
        { status: 400 }
      );
    }

    // Allocate collection to interest and principal
    const allocation = allocateCollection(
      collectionAmount,
      loan.outstandingInterest,
      loan.outstandingPrincipal
    );

    // Create collection and update loan in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create collection record
      const collection = await tx.collection.create({
        data: {
          loanId: validatedData.loanId,
          agentId: user.id,
          amount: collectionAmount.toString(),
          principalAmount: allocation.principalAmount.toString(),
          interestAmount: allocation.interestAmount.toString(),
          collectionDate: validatedData.collectionDate
            ? new Date(validatedData.collectionDate)
            : new Date(),
          paymentMethod: validatedData.paymentMethod,
          remarks: validatedData.remarks,
          receiptNumber: `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        },
      });

      // Update loan outstanding amounts
      const newOutstandingInterest = new Decimal(loan.outstandingInterest).minus(
        allocation.interestAmount
      );
      const newOutstandingPrincipal = new Decimal(loan.outstandingPrincipal).minus(
        allocation.principalAmount
      );
      const newTotalCollected = new Decimal(loan.totalCollected).plus(collectionAmount);

      // Check if loan should be closed
      const shouldClose =
        newOutstandingPrincipal.lte(0) && newOutstandingInterest.lte(0);

      const updatedLoan = await tx.loan.update({
        where: { id: validatedData.loanId },
        data: {
          outstandingInterest: newOutstandingInterest.toString(),
          outstandingPrincipal: newOutstandingPrincipal.toString(),
          totalCollected: newTotalCollected.toString(),
          status: shouldClose ? "CLOSED" : loan.status,
          closedAt: shouldClose ? new Date() : loan.closedAt,
        },
      });

      // Update EMI schedule if applicable
      const unpaidSchedules = await tx.eMISchedule.findMany({
        where: {
          loanId: validatedData.loanId,
          isPaid: false,
        },
        orderBy: { installmentNumber: "asc" },
      });

      // Apply collection to unpaid schedules
      let remainingAmount = collectionAmount;
      for (const schedule of unpaidSchedules) {
        if (remainingAmount.lte(0)) break;

        const scheduleDue = new Decimal(schedule.totalDue).minus(
          new Decimal(schedule.totalPaid)
        );

        if (scheduleDue.lte(0)) continue;

        const amountToApply = Decimal.min(remainingAmount, scheduleDue);
        const newTotalPaid = new Decimal(schedule.totalPaid).plus(amountToApply);
        const isPaid = newTotalPaid.gte(new Decimal(schedule.totalDue));

        await tx.eMISchedule.update({
          where: { id: schedule.id },
          data: {
            totalPaid: newTotalPaid.toString(),
            isPaid,
            paidAt: isPaid ? new Date() : schedule.paidAt,
          },
        });

        remainingAmount = remainingAmount.minus(amountToApply);
      }

      return { collection, loan: updatedLoan };
    });

    // Create audit log
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      userId: user.id,
      action: "COLLECTION_RECORDED",
      entityType: "Collection",
      entityId: result.collection.id,
      afterData: {
        collection: result.collection,
        loanUpdate: {
          outstandingBefore: {
            principal: loan.outstandingPrincipal,
            interest: loan.outstandingInterest,
          },
          outstandingAfter: {
            principal: result.loan.outstandingPrincipal,
            interest: result.loan.outstandingInterest,
          },
        },
      },
      ...clientInfo,
      remarks: `Collection of ${collectionAmount} recorded for loan ${loan.loanNumber}`,
    });

    // Clear caches
    await cacheDelPattern(`loan:${validatedData.loanId}*`);
    await cacheDelPattern(`loans:customer:${loan.customerId}*`);
    await cacheDelPattern(`dashboard:*`);

    return NextResponse.json(
      {
        message: "Collection recorded successfully",
        collection: result.collection,
        loan: {
          id: result.loan.id,
          status: result.loan.status,
          outstandingPrincipal: result.loan.outstandingPrincipal,
          outstandingInterest: result.loan.outstandingInterest,
          totalCollected: result.loan.totalCollected,
        },
        allocation: {
          principal: allocation.principalAmount.toString(),
          interest: allocation.interestAmount.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Collection creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to record collection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/collections - List collections
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
    const loanId = searchParams.get("loanId");
    const agentId = searchParams.get("agentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (user.role === "AGENT") {
      where.agentId = user.id;
    } else if (user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
      }
      where.loan = { customerId: customer.id };
    }

    // Apply filters
    if (loanId) {
      const hasAccess = await canAccessLoan(user.id, loanId);
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this loan" }, { status: 403 });
      }
      where.loanId = loanId;
    }

    if (agentId && (user.role === "ADMIN" || user.role === "MANAGER")) {
      where.agentId = agentId;
    }

    if (startDate || endDate) {
      where.collectionDate = {};
      if (startDate) where.collectionDate.gte = new Date(startDate);
      if (endDate) where.collectionDate.lte = new Date(endDate);
    }

    // Fetch collections
    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          loan: {
            include: {
              customer: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          agent: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { collectionDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.collection.count({ where }),
    ]);

    // Calculate totals
    const totalAmount = collections.reduce(
      (sum, c) => sum.plus(new Decimal(c.amount)),
      new Decimal(0)
    );

    return NextResponse.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: totalAmount.toString(),
        count: collections.length,
      },
    });
  } catch (error) {
    console.error("Collection list error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch collections",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
