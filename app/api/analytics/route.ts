/**
 * Analytics API Route
 * Provides comprehensive analytics for admin dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);

  // Only ADMIN and MANAGER can access analytics
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // all, today, week, month, quarter, half-year, year
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range based on period
    let dateFilter: Prisma.LoanWhereInput = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      switch (period) {
        case "today":
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          dateFilter.createdAt = { gte: startOfDay };
          break;
        case "week":
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          dateFilter.createdAt = { gte: weekAgo };
          break;
        case "month":
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          dateFilter.createdAt = { gte: monthAgo };
          break;
        case "quarter":
          const quarterAgo = new Date(now.setMonth(now.getMonth() - 3));
          dateFilter.createdAt = { gte: quarterAgo };
          break;
        case "half-year":
          const halfYearAgo = new Date(now.setMonth(now.getMonth() - 6));
          dateFilter.createdAt = { gte: halfYearAgo };
          break;
        case "year":
          const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
          dateFilter.createdAt = { gte: yearAgo };
          break;
        default:
          // 'all' - no date filter
          break;
      }
    }

    // Fetch comprehensive loan statistics
    const [
      loanStats,
      activeLoansCount,
      pendingLoansCount,
      closedLoansCount,
      defaultedLoansCount,
      totalCustomers,
      totalAgents,
      collections,
      overdueLoans,
      monthlyData,
      totalInvestment,
      totalBorrowings,
    ] = await Promise.all([
      // Overall loan statistics
      prisma.loan.aggregate({
        where: dateFilter,
        _sum: {
          principal: true,
          disbursedAmount: true,
          totalAmount: true,
          totalInterest: true,
          totalCollected: true,
          outstandingPrincipal: true,
          outstandingInterest: true,
          totalLateFees: true,
          totalPenalties: true,
        },
        _count: true,
      }),

      // Active loans count
      prisma.loan.count({
        where: { ...dateFilter, status: "ACTIVE" },
      }),

      // Pending loans count
      prisma.loan.count({
        where: { ...dateFilter, status: "PENDING" },
      }),

      // Closed loans count
      prisma.loan.count({
        where: {
          ...dateFilter,
          status: { in: ["CLOSED", "PRECLOSED"] },
        },
      }),

      // Defaulted loans count
      prisma.loan.count({
        where: { ...dateFilter, status: "DEFAULTED" },
      }),

      // Total customers
      prisma.customer.count(),

      // Total active agents
      prisma.user.count({
        where: { role: "AGENT", isActive: true },
      }),

      // Collection statistics
      prisma.collection.aggregate({
        _sum: {
          amount: true,
          principalAmount: true,
          interestAmount: true,
        },
        _count: true,
      }),

      // Overdue loans (active loans with unpaid EMIs past due date)
      prisma.loan.findMany({
        where: {
          status: "ACTIVE",
          emiSchedule: {
            some: {
              isPaid: false,
              dueDate: { lt: new Date() },
            },
          },
        },
        select: {
          id: true,
          outstandingPrincipal: true,
          outstandingInterest: true,
        },
      }),

      // Monthly trend data (last 12 months)
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::INTEGER as loan_count,
          COALESCE(SUM("disbursedAmount"), 0)::NUMERIC as total_disbursed,
          COALESCE(SUM("totalCollected"), 0)::NUMERIC as total_collected
        FROM loans
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,

      // Total investment capital
      prisma.$queryRaw<Array<{ total: any }>>`
        SELECT COALESCE(SUM(amount), 0)::NUMERIC as total FROM investments
      `.catch(() => [{ total: 0 }]),

      // Total borrowings (active)
      prisma.$queryRaw<Array<{ total: any }>>`
        SELECT COALESCE(SUM(amount), 0)::NUMERIC as total FROM borrowings WHERE status = 'ACTIVE'
      `.catch(() => [{ total: 0 }]),
    ]);

    // Calculate overdue amount
    const overdueAmount = overdueLoans.reduce((sum, loan) => {
      return (
        sum +
        parseFloat(loan.outstandingPrincipal?.toString() || "0") +
        parseFloat(loan.outstandingInterest?.toString() || "0")
      );
    }, 0);

    // Calculate profit/loss
    const totalDisbursed = parseFloat(
      loanStats._sum.disbursedAmount?.toString() || "0"
    );
    const totalCollected = parseFloat(
      loanStats._sum.totalCollected?.toString() || "0"
    );
    const totalExpectedInterest = parseFloat(
      loanStats._sum.totalInterest?.toString() || "0"
    );
    const totalLateFees = parseFloat(
      loanStats._sum.totalLateFees?.toString() || "0"
    );
    const totalPenalties = parseFloat(
      loanStats._sum.totalPenalties?.toString() || "0"
    );

    // Calculate total principal collected (totalCollected includes both principal and interest)
    // Outstanding principal shows how much principal is yet to be collected
    const outstandingPrincipal = parseFloat(
      loanStats._sum.outstandingPrincipal?.toString() || "0"
    );
    const principalCollected = totalDisbursed - outstandingPrincipal;

    // Interest collected = Total Collected - Principal Collected
    const interestCollected = totalCollected - principalCollected;

    // Profit = Interest Earned + Late Fees + Penalties
    const profitLoss = interestCollected + totalLateFees + totalPenalties;

    // Investment capital metrics
    const investmentCapital = parseFloat(totalInvestment[0]?.total?.toString() || "0");
    const borrowingsCapital = parseFloat(totalBorrowings[0]?.total?.toString() || "0");
    const totalCapital = investmentCapital + borrowingsCapital;
    const capitalBalance = totalCapital - totalDisbursed;
    const hasCapitalSurplus = capitalBalance >= 0;
    const capitalUtilization = totalCapital > 0
      ? ((totalDisbursed / totalCapital) * 100).toFixed(2)
      : "0.00";

    // Prepare response
    const analytics = {
      period,
      dateRange: dateFilter.createdAt
        ? {
            start: dateFilter.createdAt.gte,
            end: dateFilter.createdAt.lte || new Date(),
          }
        : null,

      // Key metrics
      totalLoans: loanStats._count,
      activeLoans: activeLoansCount,
      pendingLoans: pendingLoansCount,
      closedLoans: closedLoansCount,
      defaultedLoans: defaultedLoansCount,
      overdueLoans: overdueLoans.length,

      // Financial metrics
      totalDisbursed: totalDisbursed.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      principalCollected: principalCollected.toFixed(2),
      interestCollected: interestCollected.toFixed(2),
      totalOutstandingPrincipal: (
        loanStats._sum.outstandingPrincipal?.toString() || "0"
      ),
      totalOutstandingInterest: (
        loanStats._sum.outstandingInterest?.toString() || "0"
      ),
      totalOutstanding: (
        parseFloat(loanStats._sum.outstandingPrincipal?.toString() || "0") +
        parseFloat(loanStats._sum.outstandingInterest?.toString() || "0")
      ).toFixed(2),
      overdueAmount: overdueAmount.toFixed(2),
      totalLateFees: totalLateFees.toFixed(2),
      totalPenalties: totalPenalties.toFixed(2),
      expectedInterest: totalExpectedInterest.toFixed(2),
      profitLoss: profitLoss.toFixed(2),
      collectionRate: totalDisbursed > 0
        ? ((principalCollected / totalDisbursed) * 100).toFixed(2)
        : "0.00",

      // User metrics
      totalCustomers,
      totalAgents,
      totalCollections: collections._count,

      // Investment & Capital metrics
      investmentCapital: investmentCapital.toFixed(2),
      borrowingsCapital: borrowingsCapital.toFixed(2),
      totalCapital: totalCapital.toFixed(2),
      capitalBalance: Math.abs(capitalBalance).toFixed(2),
      hasCapitalSurplus,
      capitalUtilization,

      // Monthly trend data
      monthlyTrend: monthlyData,

      // Status breakdown
      statusBreakdown: {
        active: activeLoansCount,
        pending: pendingLoansCount,
        closed: closedLoansCount,
        defaulted: defaultedLoansCount,
      },
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
