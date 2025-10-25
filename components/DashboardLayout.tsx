import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: string;
  userName: string;
  userEmail: string;
}

export function DashboardLayout({
  children,
  userRole,
  userName,
  userEmail,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
