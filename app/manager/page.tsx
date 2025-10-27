import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { LoansTable } from "@/components/LoansTable";
import {
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  DollarSign,
  Wallet,
  UserPlus,
} from "lucide-react";

export default async function ManagerDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "MANAGER") {
    redirect("/login");
  }

  // Fetch comprehensive dashboard statistics
  const [
    totalLoans,
    activeLoans,
    pendingLoans,
    closedLoans,
    defaultedLoans,
    totalCustomers,
    totalAgents,
    loanStats,
    recentLoans,
    overdueLoans,
    totalInvestment,
    totalBorrowings,
  ] = await Promise.all([
    prisma.loan.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({ where: { status: "PENDING" } }),
    prisma.loan.count({ where: { status: { in: ["CLOSED", "PRECLOSED"] } } }),
    prisma.loan.count({ where: { status: "DEFAULTED" } }),
    prisma.customer.count(),
    prisma.user.count({ where: { role: "AGENT", isActive: true } }),
    prisma.loan.aggregate({
      _sum: {
        principal: true,
        disbursedAmount: true,
        totalCollected: true,
        totalInterest: true,
        outstandingPrincipal: true,
        outstandingInterest: true,
        totalLateFees: true,
        totalPenalties: true,
      },
    }),
    prisma.loan.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    }),
    // Overdue loans
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
        outstandingPrincipal: true,
        outstandingInterest: true,
      },
    }),
    // Total investment
    prisma.$queryRaw<Array<{ total: any }>>`
      SELECT COALESCE(SUM(amount), 0)::NUMERIC as total FROM investments
    `.catch(() => [{ total: 0 }]),
    // Total borrowings (active)
    prisma.$queryRaw<Array<{ total: any }>>`
      SELECT COALESCE(SUM(amount), 0)::NUMERIC as total FROM borrowings WHERE status = 'ACTIVE'
    `.catch(() => [{ total: 0 }]),
  ]);

  const totalPrincipal = new Decimal(loanStats._sum.principal || 0);
  const totalDisbursed = new Decimal(loanStats._sum.disbursedAmount || 0);
  const totalCollected = new Decimal(loanStats._sum.totalCollected || 0);
  const totalOutstandingPrincipal = new Decimal(loanStats._sum.outstandingPrincipal || 0);
  const totalOutstandingInterest = new Decimal(loanStats._sum.outstandingInterest || 0);
  const totalOutstanding = totalOutstandingPrincipal.plus(totalOutstandingInterest);
  const expectedInterest = new Decimal(loanStats._sum.totalInterest || 0);
  const totalLateFees = new Decimal(loanStats._sum.totalLateFees || 0);
  const totalPenalties = new Decimal(loanStats._sum.totalPenalties || 0);

  // Calculate profit/loss correctly
  // Principal Collected = Disbursed - Outstanding Principal
  const principalCollected = totalDisbursed.minus(totalOutstandingPrincipal);
  // Interest Collected = Total Collected - Principal Collected
  const interestCollected = totalCollected.minus(principalCollected);
  // Profit = Interest + Late Fees + Penalties
  const profitLoss = interestCollected.plus(totalLateFees).plus(totalPenalties);
  const isProfitable = profitLoss.gte(0);

  // Calculate overdue amount
  const overdueAmount = overdueLoans.reduce((sum, loan) => {
    return sum
      .plus(new Decimal(loan.outstandingPrincipal || 0))
      .plus(new Decimal(loan.outstandingInterest || 0));
  }, new Decimal(0));

  // Collection rate
  const collectionRate = totalDisbursed.gt(0)
    ? totalCollected.div(totalDisbursed).times(100)
    : new Decimal(0);

  // Investment capital
  const investmentCapital = new Decimal(totalInvestment[0]?.total?.toString() || "0");
  const borrowingsCapital = new Decimal(totalBorrowings[0]?.total?.toString() || "0");
  const totalCapital = investmentCapital.plus(borrowingsCapital);

  // Convert loans data to plain objects for client component
  const loansData = recentLoans.map((loan) => ({
    id: loan.id,
    loanNumber: loan.loanNumber,
    customerName: loan.customer.user.name,
    customerEmail: loan.customer.user.email,
    principal: loan.principal.toString(),
    status: loan.status,
    createdAt: loan.createdAt.toISOString(),
  }));

  // Calculate capital surplus/deficit
  const capitalBalance = totalCapital.minus(totalDisbursed);
  const hasCapitalSurplus = capitalBalance.gte(0);

  // Calculate capital utilization percentage
  const capitalUtilization = totalCapital.gt(0)
    ? totalDisbursed.div(totalCapital).times(100)
    : new Decimal(0);

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Manager Dashboard
            </h1>
            <p className="text-base text-gray-600 sm:text-lg">
              Welcome back, {user.name}
            </p>
          </div>
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <BarChart3 className="h-4 w-4" />
            View Full Analytics
          </Link>
        </div>

        {/* Primary Financial Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Disbursed"
            value={<Money amount={totalDisbursed} />}
            subtitle={`${activeLoans} active loans`}
            icon={DollarSign}
            variant="primary"
          />

          <StatCard
            title="Total Collected"
            value={<Money amount={totalCollected} />}
            subtitle={`${collectionRate.toFixed(1)}% collection rate`}
            icon={TrendingUp}
            variant="success"
          />

          <StatCard
            title="Outstanding"
            value={<Money amount={totalOutstanding} />}
            subtitle={`P: ₹${totalOutstandingPrincipal.toFixed(0)} | I: ₹${totalOutstandingInterest.toFixed(0)}`}
            icon={AlertCircle}
            variant="warning"
          />

          <StatCard
            title={isProfitable ? "Net Profit" : "Net Loss"}
            value={<Money amount={profitLoss.abs()} />}
            subtitle={isProfitable ? "Total profit earned" : "Current loss"}
            icon={isProfitable ? TrendingUp : TrendingDown}
            variant={isProfitable ? "success" : "danger"}
          />
        </div>

        {/* Capital Management Section - Prominent Display */}
        <div className="rounded-xl border-2 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-900">Capital Management</h2>
            <div className="flex gap-2">
              <Link
                href="/admin/investments"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <Wallet className="h-4 w-4" />
                Investments
              </Link>
              <Link
                href="/admin/borrowings"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
              >
                <TrendingDown className="h-4 w-4" />
                Borrowings
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow-sm border border-indigo-100">
              <div className="text-sm font-medium text-gray-600">Own Investment</div>
              <div className="mt-2 text-2xl font-bold text-indigo-600">
                <Money amount={investmentCapital} />
              </div>
              <div className="mt-1 text-xs text-gray-500">Capital invested</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border border-purple-100">
              <div className="text-sm font-medium text-gray-600">Borrowings</div>
              <div className="mt-2 text-2xl font-bold text-purple-600">
                <Money amount={borrowingsCapital} />
              </div>
              <div className="mt-1 text-xs text-gray-500">External capital</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border border-blue-100">
              <div className="text-sm font-medium text-gray-600">Total Capital</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">
                <Money amount={totalCapital} />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <Money amount={totalDisbursed} /> disbursed ({capitalUtilization.toFixed(1)}%)
              </div>
            </div>
            <div className={`rounded-lg p-5 shadow-sm border-2 ${
              hasCapitalSurplus
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-600">
                  {hasCapitalSurplus ? "Capital Surplus" : "Capital Deficit"}
                </div>
                {hasCapitalSurplus ? (
                  <div className="rounded-full bg-green-100 p-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <div className="rounded-full bg-orange-100 p-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                )}
              </div>
              <div className={`mt-2 text-2xl font-bold ${
                hasCapitalSurplus ? 'text-green-600' : 'text-orange-600'
              }`}>
                <Money amount={capitalBalance.abs()} />
              </div>
              <div className="mt-1 text-xs font-medium">
                {hasCapitalSurplus ? (
                  <span className="text-green-700">✓ Available for new loans</span>
                ) : (
                  <span className="text-orange-700">⚠ Over-disbursed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <StatCard
            title="Overdue Amount"
            value={<Money amount={overdueAmount} />}
            subtitle={`${overdueLoans.length} overdue loans`}
            icon={AlertCircle}
            variant="danger"
          />

          <StatCard
            title="Total Customers"
            value={totalCustomers}
            subtitle={`${totalAgents} active agents`}
            icon={Users}
            variant="success"
          />
        </div>

        {/* Loan Status Overview */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-600">Active</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{activeLoans}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-600">Pending</div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{pendingLoans}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-600">Closed</div>
            <div className="mt-1 text-2xl font-bold text-gray-600">{closedLoans}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium text-gray-600">Defaulted</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{defaultedLoans}</div>
          </div>
        </div>

        {/* Recent Loans */}
        <LoansTable
          loans={loansData}
          showViewAll={true}
          viewAllHref="/manager/loans"
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/manager/loans"
            className="group relative overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-blue-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-blue-600 p-3 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900">
                  Manage Loans
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  View and manage all loans
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/manager/collections"
            className="group relative overflow-hidden rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 transition-all duration-300 hover:border-green-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-green-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-green-600 p-3 text-white">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900">
                  Collections
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  View collection records
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="group relative overflow-hidden rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 transition-all duration-300 hover:border-purple-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-purple-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-purple-600 p-3 text-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900">
                  Analytics
                </h3>
                <p className="mt-1 text-sm text-purple-700">
                  Detailed insights & charts
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/investments"
            className="group relative overflow-hidden rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 transition-all duration-300 hover:border-orange-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-orange-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-orange-600 p-3 text-white">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900">
                  Investments
                </h3>
                <p className="mt-1 text-sm text-orange-700">
                  Track capital invested
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
