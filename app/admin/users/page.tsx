"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Settings, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  canDeleteCollections?: boolean;
  canDeleteCustomers?: boolean;
  canDeleteUsers?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState({
    canDeleteCollections: false,
    canDeleteCustomers: false,
    canDeleteUsers: false,
  });

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

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setPermissions({
      canDeleteCollections: user.canDeleteCollections || false,
      canDeleteCustomers: user.canDeleteCustomers || false,
      canDeleteUsers: user.canDeleteUsers || false,
    });
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      });

      if (response.ok) {
        setShowPermissionsModal(false);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update permissions");
      }
    } catch (error) {
      console.error("Error updating permissions:", error);
      alert("Failed to update permissions");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
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
      render: (_: unknown, row: User) => (
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
      render: (value: unknown) => (
        <span className="text-sm text-gray-900">{value ? String(value) : "—"}</span>
      ),
    },
    {
      header: "Role",
      accessor: "role",
      render: (value: unknown) => (
        <Badge variant={getRoleVariant(String(value))}>{String(value)}</Badge>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (value: unknown) => (
        <Badge variant={value ? "success" : "outline"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessor: "createdAt",
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">
          {new Date(String(value)).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "id",
      render: (_: unknown, row: User) => (
        <div className="flex items-center gap-2">
          {row.role === "MANAGER" && (
            <button
              onClick={() => handleManagePermissions(row)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50"
              title="Manage Permissions"
            >
              <Settings className="h-4 w-4" />
              Permissions
            </button>
          )}
          <button
            onClick={() => handleDeleteUser(row)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50"
            title="Delete User"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
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
              <ResponsiveTable<User>
                columns={columns}
                data={users}
                emptyMessage="No users found"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Permissions: {selectedUser.name}
              </h2>
              <p className="text-sm text-gray-600">
                Configure deletion permissions for this manager
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={permissions.canDeleteCollections}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      canDeleteCollections: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Delete Collections</div>
                  <div className="text-sm text-gray-500">
                    Allow this manager to delete collection records
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={permissions.canDeleteCustomers}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      canDeleteCustomers: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Delete Customers</div>
                  <div className="text-sm text-gray-500">
                    Allow this manager to delete customer accounts
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={permissions.canDeleteUsers}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      canDeleteUsers: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Delete Users</div>
                  <div className="text-sm text-gray-500">
                    Allow this manager to delete user accounts (except admins)
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientDashboardLayout>
  );
}
