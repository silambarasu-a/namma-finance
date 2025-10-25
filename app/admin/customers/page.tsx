"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Customer {
  id: string;
  userId: string;
  kycStatus: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: string;
  };
  agentAssignments: Array<{
    agent: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  _count: {
    loans: number;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, [search, kycFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (kycFilter) params.append("kycStatus", kycFilter);

      const response = await fetch(`/api/customers?${params}`);

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getKycVariant = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "success";
      case "REJECTED":
        return "danger";
      default:
        return "warning";
    }
  };

  const columns = [
    {
      header: "Customer",
      accessor: "customer",
      render: (_: any, row: Customer) => (
        <div>
          <div className="font-medium text-gray-900">{row.user.name}</div>
          <div className="text-sm text-gray-500">
            {row.user.email.includes('@noreply.local')
              ? `Phone: ${row.user.phone || 'N/A'}`
              : row.user.email}
          </div>
        </div>
      ),
    },
    {
      header: "Contact",
      accessor: "contact",
      render: (_: any, row: Customer) => (
        <div>
          <div className="text-sm text-gray-900">{row.user.phone || "—"}</div>
          <div className="text-sm text-gray-500">
            {row.user.address?.substring(0, 30)}
            {(row.user.address?.length || 0) > 30 ? "..." : ""}
          </div>
        </div>
      ),
    },
    {
      header: "KYC Status",
      accessor: "kycStatus",
      render: (_: any, row: Customer) => (
        <Badge variant={getKycVariant(row.kycStatus)}>{row.kycStatus}</Badge>
      ),
    },
    {
      header: "Agent",
      accessor: "agent",
      render: (_: any, row: Customer) =>
        row.agentAssignments.length > 0
          ? row.agentAssignments[0].agent.name
          : "—",
    },
    {
      header: "Loans",
      accessor: "loans",
      render: (_: any, row: Customer) => row._count.loans,
    },
    {
      header: "Status",
      accessor: "status",
      render: (_: any, row: Customer) => (
        <Badge variant={row.user.isActive ? "success" : "outline"}>
          {row.user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (_: any, row: Customer) => (
        <Link
          href={`/admin/customers/${row.id}`}
          className="text-blue-600 hover:text-blue-900"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <ClientDashboardLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600">Manage customer accounts</p>
          </div>
          <Link
            href="/admin/customers/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Customer
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All KYC Status</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <ResponsiveTable
                columns={columns}
                data={customers}
                emptyMessage="No customers found"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
