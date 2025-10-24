import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";

export default async function ManagerDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "MANAGER") {
    redirect("/login");
  }

  // Fetch dashboard statistics
  const [totalLoans, activeLoans, totalCustomers, loanStats] =
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
    ]);

  const totalPrincipal = new Decimal(loanStats._sum.principal || 0);
  const totalDisbursed = new Decimal(loanStats._sum.disbursedAmount || 0);
  const totalCollected = new Decimal(loanStats._sum.totalCollected || 0);
  const totalOutstanding = new Decimal(loanStats._sum.outstandingPrincipal || 0);

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Loans</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{totalLoans}</div>
            <div className="mt-1 text-sm text-gray-500">{activeLoans} active</div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Customers</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{totalCustomers}</div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Disbursed</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              <Money amount={totalDisbursed} />
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Principal: <Money amount={totalPrincipal} />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Outstanding</div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              <Money amount={totalOutstanding} />
            </div>
            <div className="mt-1 text-sm text-green-600">
              Collected: <Money amount={totalCollected} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href="/manager/loans"
            className="block rounded-lg border-2 border-blue-200 bg-blue-50 p-6 transition hover:bg-blue-100"
          >
            <h3 className="text-lg font-semibold text-blue-900">Manage Loans</h3>
            <p className="mt-2 text-sm text-blue-700">
              View and manage all loans
            </p>
          </Link>

          <Link
            href="/manager/collections"
            className="block rounded-lg border-2 border-green-200 bg-green-50 p-6 transition hover:bg-green-100"
          >
            <h3 className="text-lg font-semibold text-green-900">Collections</h3>
            <p className="mt-2 text-sm text-green-700">
              View collection records
            </p>
          </Link>

          <Link
            href="/manager/reports"
            className="block rounded-lg border-2 border-purple-200 bg-purple-50 p-6 transition hover:bg-purple-100"
          >
            <h3 className="text-lg font-semibold text-purple-900">Reports</h3>
            <p className="mt-2 text-sm text-purple-700">
              Generate financial reports
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
