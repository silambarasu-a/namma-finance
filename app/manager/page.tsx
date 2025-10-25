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
  AlertCircle,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default async function ManagerDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "MANAGER") {
    redirect("/login");
  }

  // Fetch dashboard statistics
  const [totalLoans, activeLoans, totalCustomers, loanStats, recentLoans] =
    await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: "ACTIVE" } }),
      prisma.customer.count(),
      prisma.loan.aggregate({
        _sum: {
          principal: true,
          disbursedAmount: true,
          totalCollected: true,
          outstandingPrincipal: true,
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
        select: {
          id: true,
          loanNumber: true,
          principal: true,
          status: true,
          createdAt: true,
          customer: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      }),
    ]);

  const totalPrincipal = new Decimal(loanStats._sum.principal || 0);
  const totalDisbursed = new Decimal(loanStats._sum.disbursedAmount || 0);
  const totalCollected = new Decimal(loanStats._sum.totalCollected || 0);
  const totalOutstanding = new Decimal(loanStats._sum.outstandingPrincipal || 0);

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
            Manager Dashboard
          </h1>
          <p className="text-base text-gray-600 sm:text-lg">
            Welcome back, {user.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Loans"
            value={totalLoans}
            subtitle={`${activeLoans} active`}
            icon={FileText}
            variant="primary"
          />

          <StatCard
            title="Total Customers"
            value={totalCustomers}
            icon={Users}
            variant="success"
          />

          <StatCard
            title="Total Disbursed"
            value={<Money amount={totalDisbursed} />}
            subtitle={
              <>
                Principal: <Money amount={totalPrincipal} />
              </>
            }
            icon={TrendingUp}
            variant="primary"
          />

          <StatCard
            title="Outstanding"
            value={<Money amount={totalOutstanding} />}
            subtitle={
              <>
                Collected: <Money amount={totalCollected} />
              </>
            }
            icon={AlertCircle}
            variant="danger"
          />
        </div>

        {/* Recent Loans */}
        <LoansTable
          loans={loansData}
          showViewAll={true}
          viewAllHref="/manager/loans"
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            href="/manager/reports"
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
                  Reports
                </h3>
                <p className="mt-1 text-sm text-purple-700">
                  Generate financial reports
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
