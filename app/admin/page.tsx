import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";

export default async function AdminDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  // Fetch dashboard statistics
  const [
    totalLoans,
    activeLoans,
    totalCustomers,
    totalAgents,
    loanStats,
    recentLoans,
  ] = await Promise.all([
    prisma.loan.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count(),
    prisma.user.count({ where: { role: "AGENT", isActive: true } }),
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
    }),
  ]);

  const totalPrincipal = new Decimal(loanStats._sum.principal || 0);
  const totalDisbursed = new Decimal(loanStats._sum.disbursedAmount || 0);
  const totalCollected = new Decimal(loanStats._sum.totalCollected || 0);
  const totalOutstanding = new Decimal(loanStats._sum.outstandingPrincipal || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Loans</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{totalLoans}</div>
            <div className="mt-1 text-sm text-gray-500">{activeLoans} active</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Customers</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{totalCustomers}</div>
            <div className="mt-1 text-sm text-gray-500">{totalAgents} agents</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Disbursed</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              <Money amount={totalDisbursed} />
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Principal: <Money amount={totalPrincipal} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Outstanding</div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              <Money amount={totalOutstanding} />
            </div>
            <div className="mt-1 text-sm text-green-600">
              Collected: <Money amount={totalCollected} />
            </div>
          </div>
        </div>

        {/* Recent Loans */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Loans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {loan.customer.user.name}
                      </div>
                      <div className="text-sm text-gray-500">{loan.customer.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loan.loanNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Money amount={loan.principal} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          loan.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : loan.status === "CLOSED"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(loan.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/loans/new"
            className="block p-6 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition"
          >
            <h3 className="text-lg font-semibold text-blue-900">Create New Loan</h3>
            <p className="mt-2 text-sm text-blue-700">
              Create a new loan for an existing customer
            </p>
          </a>

          <a
            href="/admin/customers"
            className="block p-6 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition"
          >
            <h3 className="text-lg font-semibold text-green-900">Manage Customers</h3>
            <p className="mt-2 text-sm text-green-700">
              View and manage customer accounts
            </p>
          </a>

          <a
            href="/admin/reports"
            className="block p-6 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition"
          >
            <h3 className="text-lg font-semibold text-purple-900">View Reports</h3>
            <p className="mt-2 text-sm text-purple-700">
              Generate and view financial reports
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
