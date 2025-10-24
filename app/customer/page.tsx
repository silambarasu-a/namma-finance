import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";

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

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Loans</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Loans</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {totalLoans}
            </div>
            <div className="mt-1 text-sm text-gray-500">{activeLoans} active</div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Borrowed</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              <Money amount={totalBorrowed} />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Outstanding</div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              <Money amount={totalOutstanding} />
            </div>
          </div>
        </div>

        {/* My Loans */}
        <div className="mb-8 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">My Loans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Loan Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Principal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Interest Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {customer.loans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No loans found
                    </td>
                  </tr>
                ) : (
                  customer.loans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {loan.loanNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <Money amount={new Decimal(loan.principal)} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {loan.interestRate.toString()}%
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                        <Money amount={new Decimal(loan.outstandingPrincipal)} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
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
            href="/customer/loans"
            className="block rounded-lg border-2 border-blue-200 bg-blue-50 p-6 transition hover:bg-blue-100"
          >
            <h3 className="text-lg font-semibold text-blue-900">View All Loans</h3>
            <p className="mt-2 text-sm text-blue-700">
              See all your loans and payment history
            </p>
          </Link>

          <Link
            href="/customer/payments"
            className="block rounded-lg border-2 border-green-200 bg-green-50 p-6 transition hover:bg-green-100"
          >
            <h3 className="text-lg font-semibold text-green-900">Payment History</h3>
            <p className="mt-2 text-sm text-green-700">
              View your payment history
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
