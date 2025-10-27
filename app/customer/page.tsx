import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { CustomerLoansTable } from "@/components/CustomerLoansTable";
import {
  Wallet,
  AlertCircle,
  FileText,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";

export default async function CustomerDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "CUSTOMER") {
    redirect("/login");
  }

  // Get customer record with comprehensive data
  const [customer, allLoans, upcomingEmis, overdueEmis, totalPaidCollections] = await Promise.all([
    prisma.customer.findUnique({
      where: { userId: user.id },
      include: {
        loans: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    // All loans for comprehensive stats
    prisma.loan.findMany({
      where: {
        customer: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        status: true,
        principal: true,
        disbursedAmount: true,
        totalCollected: true,
        outstandingPrincipal: true,
        outstandingInterest: true,
      },
    }),
    // Upcoming EMIs
    prisma.eMISchedule.findMany({
      where: {
        loan: {
          customer: {
            userId: user.id,
          },
          status: "ACTIVE",
        },
        isPaid: false,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        totalDue: true,
        dueDate: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 1,
    }),
    // Overdue EMIs count
    prisma.eMISchedule.count({
      where: {
        loan: {
          customer: {
            userId: user.id,
          },
          status: "ACTIVE",
        },
        isPaid: false,
        dueDate: { lt: new Date() },
      },
    }),
    // Total paid
    prisma.collection.aggregate({
      where: {
        loan: {
          customer: {
            userId: user.id,
          },
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  if (!customer) {
    redirect("/login");
  }

  // Calculate totals
  const totalLoans = allLoans.length;
  const activeLoans = allLoans.filter((l) => l.status === "ACTIVE").length;
  const closedLoans = allLoans.filter((l) => l.status === "CLOSED" || l.status === "PRECLOSED").length;

  const totalOutstandingPrincipal = allLoans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.outstandingPrincipal || 0)),
    new Decimal(0)
  );
  const totalOutstandingInterest = allLoans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.outstandingInterest || 0)),
    new Decimal(0)
  );
  const totalOutstanding = totalOutstandingPrincipal.plus(totalOutstandingInterest);

  const totalBorrowed = allLoans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.principal || 0)),
    new Decimal(0)
  );

  const totalPaid = new Decimal(totalPaidCollections._sum.amount || 0);

  const nextEmiAmount = upcomingEmis.length > 0 ? new Decimal(upcomingEmis[0].totalDue) : new Decimal(0);
  const nextEmiDate = upcomingEmis.length > 0 ? upcomingEmis[0].dueDate : null;

  // Convert loans data to plain objects for client component
  const loansData = customer.loans.map((loan) => ({
    id: loan.id,
    loanNumber: loan.loanNumber,
    principal: loan.principal.toString(),
    interestRate: loan.interestRate.toString(),
    outstandingPrincipal: loan.outstandingPrincipal.toString(),
    status: loan.status,
  }));

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            My Loans
          </h1>
          <p className="text-base text-gray-600 sm:text-lg">
            Welcome back, {user.name}
          </p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Borrowed"
            value={<Money amount={totalBorrowed} />}
            subtitle={`${activeLoans} active loans`}
            icon={Wallet}
            variant="primary"
          />

          <StatCard
            title="Total Paid"
            value={<Money amount={totalPaid} />}
            subtitle={`${closedLoans} loans closed`}
            icon={TrendingUp}
            variant="success"
          />

          <StatCard
            title="Outstanding Amount"
            value={<Money amount={totalOutstanding} />}
            subtitle={`P: ₹${totalOutstandingPrincipal.toFixed(0)} | I: ₹${totalOutstandingInterest.toFixed(0)}`}
            icon={AlertCircle}
            variant={overdueEmis > 0 ? "danger" : "warning"}
          />

          <StatCard
            title="Overdue EMIs"
            value={overdueEmis}
            subtitle={overdueEmis > 0 ? "Please pay immediately" : "All up to date"}
            icon={overdueEmis > 0 ? Clock : CheckCircle}
            variant={overdueEmis > 0 ? "danger" : "success"}
          />
        </div>

        {/* Next EMI Section */}
        {nextEmiDate && (
          <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                  <Calendar className="h-4 w-4" />
                  Next EMI Due
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    <Money amount={nextEmiAmount} />
                  </span>
                  <span className="text-sm text-gray-600">
                    due on {nextEmiDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {Math.ceil((nextEmiDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
              </div>
            </div>
          </div>
        )}

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Loans"
            value={totalLoans}
            subtitle={`${activeLoans} active, ${closedLoans} closed`}
            icon={FileText}
            variant="default"
          />

          <StatCard
            title="Upcoming EMIs"
            value={upcomingEmis.length}
            subtitle="Due in next 7 days"
            icon={Calendar}
            variant="default"
          />

          <StatCard
            title="Loan Status"
            value={activeLoans > 0 ? "Active" : "No Active Loans"}
            subtitle={activeLoans > 0 ? `${activeLoans} loan(s) active` : "All loans settled"}
            icon={activeLoans > 0 ? CreditCard : CheckCircle}
            variant={activeLoans > 0 ? "primary" : "success"}
          />
        </div>

        {/* My Loans Table */}
        <CustomerLoansTable
          loans={loansData}
          totalLoans={totalLoans}
          showViewAll={true}
          viewAllHref="/customer/loans"
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/customer/loans"
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
                  View All Loans
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  See all your loans and payment history
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/customer/payments"
            className="group relative overflow-hidden rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 transition-all duration-300 hover:border-green-300 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-green-600 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-green-600 p-3 text-white">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900">
                  Payment History
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  View your payment history and receipts
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
