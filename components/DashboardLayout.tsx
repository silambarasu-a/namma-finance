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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
