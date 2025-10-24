"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Wallet,
  UserCircle,
  LogOut,
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const sidebarLinks: SidebarLink[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: Users,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/loans",
    label: "Loans",
    icon: FileText,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/collections",
    label: "Collections",
    icon: CreditCard,
    roles: ["ADMIN", "MANAGER", "AGENT"],
  },
  {
    href: "/admin/borrowings",
    label: "Borrowings",
    icon: Wallet,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: UserCircle,
    roles: ["ADMIN"],
  },
  {
    href: "/manager",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["MANAGER"],
  },
  {
    href: "/manager/loans",
    label: "Loans",
    icon: FileText,
    roles: ["MANAGER"],
  },
  {
    href: "/manager/collections",
    label: "Collections",
    icon: CreditCard,
    roles: ["MANAGER"],
  },
  {
    href: "/manager/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["MANAGER"],
  },
  {
    href: "/agent",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["AGENT"],
  },
  {
    href: "/agent/customers",
    label: "My Customers",
    icon: Users,
    roles: ["AGENT"],
  },
  {
    href: "/agent/collections",
    label: "Collections",
    icon: CreditCard,
    roles: ["AGENT"],
  },
  {
    href: "/customer",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["CUSTOMER"],
  },
  {
    href: "/customer/loans",
    label: "My Loans",
    icon: FileText,
    roles: ["CUSTOMER"],
  },
  {
    href: "/customer/payments",
    label: "Payment History",
    icon: CreditCard,
    roles: ["CUSTOMER"],
  },
];

interface SidebarProps {
  userRole: string;
  userName: string;
  userEmail: string;
}

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  const filteredLinks = sidebarLinks.filter((link) =>
    link.roles.includes(userRole)
  );

  // Get base path (e.g., /admin, /manager, /agent, /customer)
  const basePath = "/" + pathname.split("/")[1];

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800 px-6">
        <h1 className="text-xl font-bold text-blue-400">Namma Finance</h1>
      </div>

      {/* User Info */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="text-sm font-medium text-gray-300">{userName}</div>
        <div className="text-xs text-gray-500">{userEmail}</div>
        <div className="mt-1 inline-block rounded-full bg-blue-600 px-2 py-1 text-xs font-medium">
          {userRole}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 p-4">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
