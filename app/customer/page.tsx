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
} from "lucide-react";

export default async function CustomerDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "CUSTOMER") {
    redirect("/login");
  }

  // Get customer record
  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
    include: {
      loans: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!customer) {
    redirect("/login");
  }

  // Calculate totals
  const totalLoans = customer.loans.length;
  const activeLoans = customer.loans.filter((l) => l.status === "ACTIVE").length;
  const totalOutstanding = customer.loans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.outstandingPrincipal)),
    new Decimal(0)
  );
  const totalBorrowed = customer.loans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.principal)),
    new Decimal(0)
  );

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Loans"
            value={totalLoans}
            subtitle={`${activeLoans} active`}
            icon={FileText}
            variant="primary"
          />

          <StatCard
            title="Total Borrowed"
            value={<Money amount={totalBorrowed} />}
            icon={Wallet}
            variant="success"
          />

          <StatCard
            title="Outstanding Amount"
            value={<Money amount={totalOutstanding} />}
            icon={AlertCircle}
            variant="danger"
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
