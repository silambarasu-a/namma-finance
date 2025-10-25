"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "danger";
      case "MANAGER":
        return "info";
      case "AGENT":
        return "success";
      case "CUSTOMER":
        return "warning";
      default:
        return "outline";
    }
  };

  const columns = [
    {
      header: "User",
      accessor: "name",
      render: (_: any, row: User) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">
            {row.email.includes('@noreply.local')
              ? `Phone: ${row.phone || 'N/A'}`
              : row.email}
          </div>
        </div>
      ),
    },
    {
      header: "Phone",
      accessor: "phone",
      render: (value: string | null) => (
        <span className="text-sm text-gray-900">{value || "—"}</span>
      ),
    },
    {
      header: "Role",
      accessor: "role",
      render: (value: string) => (
        <Badge variant={getRoleVariant(value)}>{value}</Badge>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (value: boolean) => (
        <Badge variant={value ? "success" : "outline"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessor: "createdAt",
      render: (value: string) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600">Manage system users and permissions</p>
            </div>
          </div>
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add User
          </Link>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              </div>
            ) : (
              <ResponsiveTable
                columns={columns}
                data={users}
                emptyMessage="No users found"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
