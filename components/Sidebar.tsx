"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-600",
  MANAGER: "bg-blue-600",
  AGENT: "bg-green-600",
  CUSTOMER: "bg-orange-600",
};

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredLinks = sidebarLinks.filter((link) =>
    link.roles.includes(userRole)
  );

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-gray-900 p-2 text-white shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl transition-transform duration-300 md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo/Brand */}
        <div className="flex h-20 items-center justify-center border-b border-gray-700/50 px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 font-bold text-white shadow-lg">
              NF
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Namma Finance</h1>
              <p className="text-xs text-gray-400">Loan Management</p>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="mx-4 my-4 rounded-xl bg-gray-800/50 p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {userName}
              </div>
              <div className="truncate text-xs text-gray-400">{userEmail}</div>
              <Badge
                className={cn(
                  "mt-1 text-xs text-white",
                  roleColors[userRole] || "bg-gray-600"
                )}
              >
                {userRole}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-300 hover:bg-gray-800/80 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive && "text-white"
                  )}
                />
                <span>{link.label}</span>
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-white shadow-lg" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-700/50 p-4">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-red-600/20 hover:text-red-400"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
