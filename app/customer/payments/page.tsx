import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";

export default async function CustomerPaymentsPage() {
  const user = await getSessionUser();

  if (!user || user.role !== "CUSTOMER") {
    redirect("/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { userId: user.id },
  });

  if (!customer) {
    redirect("/login");
  }

  // Fetch all collections for customer's loans
  const collections = await prisma.collection.findMany({
    where: {
      loan: {
        customerId: customer.id,
      },
    },
    include: {
      loan: {
        select: {
          loanNumber: true,
        },
      },
      agent: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { collectionDate: "desc" },
  });

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600">All your EMI payments</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-600">Total Payments</div>
            <div className="text-3xl font-bold text-gray-900">
              {collections.length}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-600">Total Amount Paid</div>
            <div className="text-2xl font-bold text-green-600">
              <Money
                amount={collections.reduce(
                  (sum, c) => sum.plus(new Decimal(c.amount)),
                  new Decimal(0)
                )}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Receipt #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Loan #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Principal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Interest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {collections.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No payments recorded yet
                  </td>
                </tr>
              ) : (
                collections.map((collection) => (
                  <tr key={collection.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(collection.collectionDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {collection.receiptNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {collection.loan.loanNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                      <Money amount={new Decimal(collection.amount)} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <Money amount={new Decimal(collection.principalAmount)} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <Money amount={new Decimal(collection.interestAmount)} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                        {collection.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
