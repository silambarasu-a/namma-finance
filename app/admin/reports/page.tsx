import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";

export default async function AdminReportsPage() {
  const user = await getSessionUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <DashboardLayout
      userRole={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Financial reports and analytics</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Portfolio Summary
            </h3>
            <p className="text-sm text-gray-600">
              Overview of total loans, disbursements, and collections
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
              Coming Soon →
            </button>
          </div>

          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Collection Report
            </h3>
            <p className="text-sm text-gray-600">
              Daily, weekly, and monthly collection summaries
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
              Coming Soon →
            </button>
          </div>

          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Agent Performance
            </h3>
            <p className="text-sm text-gray-600">
              Track agent-wise collection performance
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
              Coming Soon →
            </button>
          </div>

          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Defaulter List
            </h3>
            <p className="text-sm text-gray-600">
              Customers with overdue EMIs
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
              Coming Soon →
            </button>
          </div>

          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Interest Income
            </h3>
            <p className="text-sm text-gray-600">
              Track interest earned over time
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
              Coming Soon →
            </button>
          </div>

          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Loan Aging
            </h3>
            <p className="text-sm text-gray-600">
              Age-wise analysis of outstanding loans
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
              Coming Soon →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
