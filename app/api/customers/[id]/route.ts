/**
 * Customer Detail API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserFromRequest(request);

  if (!user || !["ADMIN", "MANAGER", "AGENT"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: customerId } = await params;

    // Fetch customer with all related data
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        loans: {
          orderBy: { createdAt: "desc" },
          include: {
            emiSchedule: {
              where: { isPaid: false },
              orderBy: { dueDate: "asc" },
              take: 1,
            },
          },
        },
        agentAssignments: {
          where: { isActive: true },
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
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Calculate customer statistics
    const totalLoans = customer.loans.length;
    const activeLoans = customer.loans.filter(l => l.status === "ACTIVE").length;
    const totalBorrowed = customer.loans.reduce(
      (sum, loan) => sum + parseFloat(loan.principal.toString()),
      0
    );
    const totalOutstanding = customer.loans.reduce(
      (sum, loan) =>
        sum +
        parseFloat(loan.outstandingPrincipal.toString()) +
        parseFloat(loan.outstandingInterest.toString()),
      0
    );
    const totalPaid = customer.loans.reduce(
      (sum, loan) => sum + parseFloat(loan.totalCollected.toString()),
      0
    );

    // Get overdue EMIs count
    const overdueEmis = await prisma.eMISchedule.count({
      where: {
        loan: {
          customerId: customerId,
          status: "ACTIVE",
        },
        isPaid: false,
        dueDate: { lt: new Date() },
      },
    });

    // Get upcoming EMIs (next 7 days)
    const upcomingEmis = await prisma.eMISchedule.findMany({
      where: {
        loan: {
          customerId: customerId,
          status: "ACTIVE",
        },
        isPaid: false,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        loan: {
          select: {
            loanNumber: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Serialize loans data
    const serializedLoans = customer.loans.map((loan) => ({
      id: loan.id,
      loanNumber: loan.loanNumber,
      principal: loan.principal.toString(),
      interestRate: loan.interestRate.toString(),
      status: loan.status,
      disbursedAt: loan.disbursedAt?.toISOString() || null,
      startDate: loan.startDate?.toISOString() || null,
      endDate: loan.endDate?.toISOString() || null,
      outstandingPrincipal: loan.outstandingPrincipal.toString(),
      outstandingInterest: loan.outstandingInterest.toString(),
      totalCollected: loan.totalCollected.toString(),
      totalAmount: loan.totalAmount.toString(),
      tenureInInstallments: loan.tenureInInstallments,
      installmentAmount: loan.installmentAmount.toString(),
      nextEmi: loan.emiSchedule[0]
        ? {
            installmentNumber: loan.emiSchedule[0].installmentNumber,
            dueDate: loan.emiSchedule[0].dueDate.toISOString(),
            totalDue: loan.emiSchedule[0].totalDue.toString(),
          }
        : null,
      createdAt: loan.createdAt.toISOString(),
    }));

    // Serialize upcoming EMIs
    const serializedUpcomingEmis = upcomingEmis.map((emi) => ({
      id: emi.id,
      loanNumber: emi.loan.loanNumber,
      installmentNumber: emi.installmentNumber,
      dueDate: emi.dueDate.toISOString(),
      totalDue: emi.totalDue.toString(),
    }));

    const response = {
      customer: {
        id: customer.id,
        userId: customer.userId,
        dob: customer.dob?.toISOString() || null,
        idProof: customer.idProof,
        kycStatus: customer.kycStatus,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        user: customer.user,
        loans: serializedLoans,
        agent: customer.agentAssignments[0]?.agent || null,
      },
      statistics: {
        totalLoans,
        activeLoans,
        totalBorrowed: totalBorrowed.toFixed(2),
        totalOutstanding: totalOutstanding.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        overdueEmis,
      },
      upcomingEmis: serializedUpcomingEmis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer details" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id] - Delete a customer (Admin or Manager with permission)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - Only ADMIN or MANAGER with canDeleteCustomers
    if (user.role === "ADMIN") {
      // Admin can always delete
    } else if (user.role === "MANAGER") {
      // Manager needs explicit permission
      if (!user.canDeleteCustomers) {
        return NextResponse.json(
          { error: "You don't have permission to delete customers. Contact an admin." },
          { status: 403 }
        );
      }
    } else {
      // AGENT and CUSTOMER cannot delete
      return NextResponse.json(
        { error: "Only admins and authorized managers can delete customers" },
        { status: 403 }
      );
    }

    const { id: customerId } = await params;

    // Fetch customer with related data
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        user: true,
        loans: { select: { id: true, status: true } },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check if customer has active loans
    const hasActiveLoans = customer.loans.some(
      (loan) => loan.status === "ACTIVE" || loan.status === "PENDING"
    );

    if (hasActiveLoans) {
      return NextResponse.json(
        {
          error: "Cannot delete customer with active or pending loans",
          activeLoans: customer.loans.filter(
            (l) => l.status === "ACTIVE" || l.status === "PENDING"
          ).length,
        },
        { status: 400 }
      );
    }

    // Store data for audit log before deletion
    const customerData = {
      id: customer.id,
      userId: customer.userId,
      userName: customer.user.name,
      userEmail: customer.user.email,
      userPhone: customer.user.phone,
      kycStatus: customer.kycStatus,
      totalLoans: customer.loans.length,
    };

    // Delete customer and associated user in transaction
    await prisma.$transaction(async (tx) => {
      // Delete customer (cascades to agent assignments)
      await tx.customer.delete({
        where: { id: customerId },
      });

      // Delete associated user
      await tx.user.delete({
        where: { id: customer.userId },
      });
    });

    // Create audit log
    const clientInfo = getClientInfo(request);
    await createAuditLog({
      userId: user.id,
      action: "USER_UPDATED",
      entityType: "Customer",
      entityId: customerId,
      beforeData: customerData,
      afterData: null,
      ...clientInfo,
      remarks: `Customer ${customer.user.name} deleted by ${user.role}`,
    });

    return NextResponse.json({
      message: "Customer deleted successfully",
      deletedCustomer: {
        name: customer.user.name,
        email: customer.user.email,
      },
    });
  } catch (error) {
    console.error("Customer deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete customer",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
