import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";

export default async function ManagerReportsPage() {
  const user = await getSessionUser();

  if (!user || user.role !== "MANAGER") {
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

        <div className="rounded-lg bg-white p-8 text-center shadow">
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            Reports Coming Soon
          </h3>
          <p className="text-gray-600">
            Portfolio summary, collection reports, agent performance, and defaulter lists
            will be available here
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
