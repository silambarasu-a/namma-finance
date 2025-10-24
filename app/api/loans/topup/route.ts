/**
 * Loan Top-Up API Route
 *
 * POST /api/loans/topup - Add additional amount to existing active loan
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminOrManager } from "@/lib/auth";
import { calculateTopUpLoan } from "@/lib/payments-advanced";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { queueGenerateEMISchedule } from "@/lib/queue";
import { cacheDelPattern } from "@/lib/cache";

const topUpLoanSchema = z.object({
  loanId: z.string().cuid(),
  topUpAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  newTenure: z.number().int().positive().optional(), // If changing tenure
  newInterestRate: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(), // If changing rate
  charges: z
    .array(
      z.object({
        type: z.enum(["STAMP_DUTY", "DOCUMENT_FEE", "PROCESSING_FEE", "OTHER"]),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      })
    )
    .optional(),
  remarks: z.string().optional(),
});

/**
 * POST /api/loans/topup - Create top-up for existing loan
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const user = await getSessionUserFromRequest(request);
    if (!user || !isAdminOrManager(user)) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins and managers can create top-ups." },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = topUpLoanSchema.parse(body);

    // Fetch existing loan
    const existingLoan = await prisma.loan.findUnique({
      where: { id: validatedData.loanId },
      include: {
        customer: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        lateFees: { where: { isPaid: false } },
        penalties: { where: { isPaid: false } },
      },
    });

    if (!existingLoan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Validate loan is active
    if (existingLoan.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Cannot top-up ${existingLoan.status.toLowerCase()} loan. Loan must be active.` },
        { status: 400 }
      );
    }

    // Check for unpaid late fees or penalties
    const unpaidLateFees = existingLoan.lateFees.reduce(
      (sum, fee) => sum.plus(new Decimal(fee.amount)),
      new Decimal(0)
    );
    const unpaidPenalties = existingLoan.penalties.reduce(
      (sum, penalty) => sum.plus(new Decimal(penalty.amount)),
      new Decimal(0)
    );

    if (unpaidLateFees.gt(0) || unpaidPenalties.gt(0)) {
      return NextResponse.json(
        {
          error: "Cannot process top-up with unpaid late fees or penalties",
          unpaidLateFees: unpaidLateFees.toString(),
          unpaidPenalties: unpaidPenalties.toString(),
        },
        { status: 400 }
      );
    }

    // Calculate top-up details
    const topUpCalc = calculateTopUpLoan({
      existingPrincipal: existingLoan.principal,
      existingOutstanding: existingLoan.outstandingPrincipal,
      topUpAmount: validatedData.topUpAmount,
      interestRate: validatedData.newInterestRate || existingLoan.interestRate,
      newTenure: validatedData.newTenure || existingLoan.tenureInInstallments,
      frequency: existingLoan.frequency,
      repaymentType: existingLoan.repaymentType,
      customPeriodDays: existingLoan.customPeriodDays || undefined,
    });

    // Calculate charges and disbursed amount
    const charges = validatedData.charges || [];
    const totalCharges = charges.reduce(
      (acc, c) => acc.plus(new Decimal(c.amount)),
      new Decimal(0)
    );
    const topUpDisbursed = new Decimal(validatedData.topUpAmount).minus(totalCharges);

    if (topUpDisbursed.lte(0)) {
      return NextResponse.json(
        { error: "Charges cannot exceed top-up amount" },
        { status: 400 }
      );
    }

    // Create top-up loan in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Close existing loan (mark as preclosed for top-up)
      const closedLoan = await tx.loan.update({
        where: { id: existingLoan.id },
        data: {
          status: "PRECLOSED",
          closedAt: new Date(),
          remarks: `Closed for top-up. New loan created with additional amount of ${validatedData.topUpAmount}`,
        },
      });

      // Create new loan with combined amount
      const newLoan = await tx.loan.create({
        data: {
          customerId: existingLoan.customerId,
          createdById: user.id,
          principal: topUpCalc.newPrincipal.toString(),
          interestRate: validatedData.newInterestRate || existingLoan.interestRate,
          frequency: existingLoan.frequency,
          repaymentType: existingLoan.repaymentType,
          customPeriodDays: existingLoan.customPeriodDays,
          tenureInInstallments: validatedData.newTenure || existingLoan.tenureInInstallments,
          installmentAmount: topUpCalc.newInstallment.toString(),
          totalInterest: "0.00", // Will be calculated by schedule generation
          totalAmount: topUpCalc.newPrincipal.toString(),
          disbursedAmount: topUpDisbursed.toString(),
          status: "ACTIVE",
          startDate: new Date(),
          outstandingPrincipal: topUpCalc.newPrincipal.toString(),
          outstandingInterest: "0.00",
          // Top-up specific fields
          isTopUp: true,
          topUpAmount: validatedData.topUpAmount,
          originalLoanId: existingLoan.id,
          lateFeeRate: existingLoan.lateFeeRate,
          penaltyRate: existingLoan.penaltyRate,
          gracePeriodDays: existingLoan.gracePeriodDays,
          remarks: validatedData.remarks || `Top-up from loan ${existingLoan.loanNumber}`,
        },
      });

      // Create charges for new loan
      if (charges.length > 0) {
        await tx.loanCharge.createMany({
          data: charges.map((charge) => ({
            loanId: newLoan.id,
            type: charge.type,
            amount: charge.amount,
          })),
        });
      }

      return { closedLoan, newLoan };
    });

    // Create audit log
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      userId: user.id,
      action: "LOAN_CREATED",
      entityType: "Loan",
      entityId: result.newLoan.id,
      beforeData: {
        originalLoan: {
          id: existingLoan.id,
          loanNumber: existingLoan.loanNumber,
          principal: existingLoan.principal,
          outstandingPrincipal: existingLoan.outstandingPrincipal,
        },
      },
      afterData: result.newLoan,
      ...clientInfo,
      remarks: `Top-up loan created for ${existingLoan.customer.user.name}. Added ${validatedData.topUpAmount} to existing outstanding.`,
    });

    // Clear customer cache
    await cacheDelPattern(`loans:customer:${existingLoan.customerId}*`);
    await cacheDelPattern(`dashboard:*`);

    // Queue EMI schedule generation for new loan
    await queueGenerateEMISchedule(result.newLoan.id);

    return NextResponse.json(
      {
        message: "Top-up loan created successfully",
        oldLoan: {
          id: result.closedLoan.id,
          loanNumber: result.closedLoan.loanNumber,
          status: result.closedLoan.status,
        },
        newLoan: result.newLoan,
        topUpDetails: {
          topUpAmount: topUpCalc.topUpAmount.toString(),
          previousPrincipal: existingLoan.principal,
          previousOutstanding: existingLoan.outstandingPrincipal,
          newPrincipal: topUpCalc.newPrincipal.toString(),
          previousInstallment: existingLoan.installmentAmount,
          newInstallment: topUpCalc.newInstallment.toString(),
          incrementInEMI: topUpCalc.incrementInEMI.toString(),
          disbursedAmount: topUpDisbursed.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Top-up loan creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create top-up loan",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
