import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";

export default async function AgentDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "AGENT") {
    redirect("/login");
  }

  // Fetch agent's assigned customers and their loans
  const [myCustomers, myCollectionsCount, recentLoans] = await Promise.all([
    prisma.customer.count({
      where: {
        agentAssignments: {
          some: {
            agentId: user.id,
            isActive: true,
          },
        },
      },
    }),
    prisma.collection.count({
      where: {
        agentId: user.id,
      },
    }),
    prisma.loan.findMany({
      where: {
        customer: {
          agentAssignments: {
            some: {
              agentId: user.id,
              isActive: true,
            },
          },
        },
        status: "ACTIVE",
      },
      include: {
        customer: {
          include: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Calculate total outstanding for agent's customers
  const totalOutstanding = recentLoans.reduce(
    (sum, loan) => sum.plus(new Decimal(loan.outstandingPrincipal)),
    new Decimal(0)
  );

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">My Customers</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {myCustomers}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Collections Made</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {myCollectionsCount}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Outstanding</div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              <Money amount={totalOutstanding} />
            </div>
          </div>
        </div>

        {/* Recent Active Loans */}
        <div className="mb-8 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Loans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Loan Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recentLoans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No active loans found
                    </td>
                  </tr>
                ) : (
                  recentLoans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {loan.customer.user.name}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {loan.loanNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                        <Money amount={new Decimal(loan.outstandingPrincipal)} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {loan.customer.user.phone || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/agent/customers"
            className="block rounded-lg border-2 border-blue-200 bg-blue-50 p-6 transition hover:bg-blue-100"
          >
            <h3 className="text-lg font-semibold text-blue-900">My Customers</h3>
            <p className="mt-2 text-sm text-blue-700">
              View customers assigned to you
            </p>
          </Link>

          <Link
            href="/agent/collections"
            className="block rounded-lg border-2 border-green-200 bg-green-50 p-6 transition hover:bg-green-100"
          >
            <h3 className="text-lg font-semibold text-green-900">Record Collection</h3>
            <p className="mt-2 text-sm text-green-700">
              Record EMI payments
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
