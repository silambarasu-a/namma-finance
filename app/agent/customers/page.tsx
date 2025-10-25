"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Customer {
  id: string;
  userId: string;
  kycStatus: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
  _count: {
    loans: number;
  };
}

export default function AgentCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

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
          <div className="text-sm text-gray-500">{row.user.email}</div>
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
      header: "Active Loans",
      accessor: "loans",
      mobileLabel: "Loans",
      render: (_: any, row: Customer) => row._count.loans,
    },
  ];

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Customers</h1>
        <p className="text-gray-600">Customers assigned to you</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-gray-600">Total Customers Assigned</div>
          <div className="text-3xl font-bold text-gray-900">
            {customers.length}
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
              emptyMessage="No customers assigned to you yet"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
