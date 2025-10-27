import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";

/**
 * GET /api/loans/[id]
 * Get detailed information about a specific loan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: loanId } = await params;

    // Build query based on user role
    const whereClause: any = { id: loanId };

    if (user.role === "CUSTOMER") {
      // Customers can only view their own loans
      const customer = await prisma.customer.findUnique({
        where: { userId: user.id },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer profile not found" },
          { status: 404 }
        );
      }

      whereClause.customerId = customer.id;
    } else if (user.role === "AGENT") {
      // Agents can only view loans of their assigned customers
      const agentCustomers = await prisma.customer.findMany({
        where: {
          agentAssignments: {
            some: {
              agentId: user.id,
              isActive: true,
            },
          },
        },
        select: { id: true },
      });

      whereClause.customerId = {
        in: agentCustomers.map((c) => c.id),
      };
    }
    // ADMIN and MANAGER can view all loans

    const loan = await prisma.loan.findFirst({
      where: whereClause,
      include: {
        customer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            agentAssignments: {
              where: {
                isActive: true,
              },
              take: 1,
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        emiSchedule: {
          orderBy: {
            installmentNumber: "asc",
          },
        },
        collections: {
          orderBy: {
            collectionDate: "desc",
          },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        charges: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Serialize the loan data
    const serializedLoan = {
      id: loan.id,
      loanNumber: loan.loanNumber,
      principal: loan.principal?.toString() || "0",
      interestRate: loan.interestRate?.toString() || "0",
      frequency: loan.frequency,
      repaymentType: loan.repaymentType,
      customPeriodDays: loan.customPeriodDays,
      tenureInInstallments: loan.tenureInInstallments,
      installmentAmount: loan.installmentAmount?.toString() || "0",
      totalInterest: loan.totalInterest?.toString() || "0",
      totalAmount: loan.totalAmount?.toString() || "0",
      originalLoanId: loan.originalLoanId,
      isTopUp: loan.isTopUp,
      topUpAmount: loan.topUpAmount?.toString() || "0",
      disbursedAmount: loan.disbursedAmount?.toString() || "0",
      disbursedAt: loan.disbursedAt?.toISOString() || null,
      firstInstallmentPaid: loan.firstInstallmentPaid,
      status: loan.status,
      startDate: loan.startDate?.toISOString() || null,
      endDate: loan.endDate?.toISOString() || null,
      closedAt: loan.closedAt?.toISOString() || null,
      outstandingPrincipal: loan.outstandingPrincipal?.toString() || "0",
      outstandingInterest: loan.outstandingInterest?.toString() || "0",
      totalCollected: loan.totalCollected?.toString() || "0",
      totalLateFees: loan.totalLateFees?.toString() || "0",
      totalPenalties: loan.totalPenalties?.toString() || "0",
      lateFeeRate: loan.lateFeeRate?.toString() || "0",
      penaltyRate: loan.penaltyRate?.toString() || "0",
      gracePeriodDays: loan.gracePeriodDays,
      remarks: loan.remarks,
      createdAt: loan.createdAt.toISOString(),
      updatedAt: loan.updatedAt.toISOString(),
      customer: {
        id: loan.customer.id,
        userId: loan.customer.userId,
        dob: loan.customer.dob?.toISOString() || null,
        idProof: loan.customer.idProof,
        kycStatus: loan.customer.kycStatus,
        user: loan.customer.user,
        agent: loan.customer.agentAssignments[0]?.agent || null,
      },
      createdBy: loan.createdBy,
      emiSchedules: loan.emiSchedule.map((emi) => ({
        id: emi.id,
        installmentNumber: emi.installmentNumber,
        dueDate: emi.dueDate.toISOString(),
        principalDue: emi.principalDue?.toString() || "0",
        interestDue: emi.interestDue?.toString() || "0",
        totalDue: emi.totalDue?.toString() || "0",
        principalPaid: emi.principalPaid?.toString() || "0",
        interestPaid: emi.interestPaid?.toString() || "0",
        totalPaid: emi.totalPaid?.toString() || "0",
        isPaid: emi.isPaid,
        paidAt: emi.paidAt?.toISOString() || null,
      })),
      collections: loan.collections.map((collection) => ({
        id: collection.id,
        amount: collection.amount?.toString() || "0",
        principalAmount: collection.principalAmount?.toString() || "0",
        interestAmount: collection.interestAmount?.toString() || "0",
        collectionDate: collection.collectionDate.toISOString(),
        receiptNumber: collection.receiptNumber,
        paymentMethod: collection.paymentMethod,
        remarks: collection.remarks,
        agent: collection.agent,
      })),
      charges: loan.charges.map((charge) => ({
        id: charge.id,
        type: charge.type,
        amount: charge.amount?.toString() || "0",
        description: null,
        appliedAt: charge.createdAt.toISOString(),
      })),
    };

    return NextResponse.json({ loan: serializedLoan });
  } catch (error) {
    console.error("Error fetching loan details:", error);
    return NextResponse.json(
      { error: "Failed to fetch loan details" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/loans/[id]
 * Update loan status (approve, disburse, close, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and MANAGER can update loans
    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: loanId } = await params;
    const body = await request.json();
    const { action, ...updateData } = body;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    let updatedLoan;

    // Handle specific actions
    if (action === "approve") {
      updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: "ACTIVE",
          remarks: updateData.remarks || loan.remarks,
        },
      });
    } else if (action === "disburse") {
      updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: "ACTIVE",
          disbursedAt: new Date(),
          disbursedAmount: updateData.disbursedAmount
            ? parseFloat(updateData.disbursedAmount)
            : loan.principal,
          startDate: new Date(),
          remarks: updateData.remarks || loan.remarks,
        },
      });
    } else if (action === "close") {
      updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          remarks: updateData.remarks || loan.remarks,
        },
      });
    } else if (action === "preclose") {
      updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: "PRECLOSED",
          closedAt: new Date(),
          remarks: updateData.remarks || loan.remarks,
        },
      });
    } else if (action === "default") {
      updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: "DEFAULTED",
          remarks: updateData.remarks || loan.remarks,
        },
      });
    } else {
      // Generic update
      updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: updateData,
      });
    }

    return NextResponse.json({
      message: "Loan updated successfully",
      loan: {
        id: updatedLoan.id,
        status: updatedLoan.status,
      },
    });
  } catch (error) {
    console.error("Error updating loan:", error);
    return NextResponse.json(
      { error: "Failed to update loan" },
      { status: 500 }
    );
  }
}
