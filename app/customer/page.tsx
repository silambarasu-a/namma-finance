import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function CustomerDashboard() {
  const user = await getSessionUser();

  if (!user || user.role !== "CUSTOMER") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">My Loans</h1>
          <p className="text-sm text-gray-600">Welcome, {user.name}</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Customer features coming soon...</p>
      </main>
    </div>
  );
}
