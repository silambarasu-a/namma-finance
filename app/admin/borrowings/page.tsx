"use client";

import { useEffect, useState } from "react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";
import { Wallet, Plus, Search, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

interface Borrowing {
  id: string;
  lenderName: string;
  amount: string;
  interestRate: string;
  startDate: string;
  endDate: string;
  status: string;
  outstandingAmount: string;
  totalPaid: string;
  createdAt: string;
}

export default function BorrowingsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchBorrowings();
  }, [search, statusFilter]);

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/borrowings?${params}`);

      if (response.ok) {
        const data = await response.json();
        setBorrowings(data.borrowings || []);
      }
    } catch (error) {
      console.error("Error fetching borrowings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "CLOSED":
        return "outline";
      case "DEFAULTED":
        return "danger";
      default:
        return "warning";
    }
  };

  // Calculate statistics
  const totalBorrowed = borrowings.reduce(
    (sum, b) => sum.plus(new Decimal(b.amount)),
    new Decimal(0)
  );
  const totalOutstanding = borrowings.reduce(
    (sum, b) => sum.plus(new Decimal(b.outstandingAmount)),
    new Decimal(0)
  );
  const totalPaid = borrowings.reduce(
    (sum, b) => sum.plus(new Decimal(b.totalPaid)),
    new Decimal(0)
  );
  const activeBorrowings = borrowings.filter((b) => b.status === "ACTIVE").length;

  const columns = [
    {
      header: "Lender",
      accessor: "lenderName",
      render: (value: string) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      header: "Amount",
      accessor: "amount",
      render: (value: string) => (
        <span className="font-semibold text-gray-900">
          <Money amount={new Decimal(value)} />
        </span>
      ),
    },
    {
      header: "Interest Rate",
      accessor: "interestRate",
      render: (value: string) => (
        <span className="text-sm text-gray-900">{value}%</span>
      ),
    },
    {
      header: "Outstanding",
      accessor: "outstandingAmount",
      render: (value: string) => (
        <span className="font-semibold text-red-600">
          <Money amount={new Decimal(value)} />
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)}>{value}</Badge>
      ),
    },
    {
      header: "End Date",
      accessor: "endDate",
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <Wallet className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Borrowings</h1>
              <p className="text-gray-600">Manage company borrowings and liabilities</p>
            </div>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Borrowing
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Borrowed"
            value={<Money amount={totalBorrowed} />}
            subtitle={`${activeBorrowings} active`}
            icon={TrendingUp}
            variant="primary"
          />

          <StatCard
            title="Outstanding"
            value={<Money amount={totalOutstanding} />}
            icon={AlertCircle}
            variant="danger"
          />

          <StatCard
            title="Total Paid"
            value={<Money amount={totalPaid} />}
            icon={DollarSign}
            variant="success"
          />

          <StatCard
            title="Total Borrowings"
            value={borrowings.length}
            subtitle={`${activeBorrowings} active`}
            icon={Wallet}
            variant="default"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by lender name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-11 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 md:w-48"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
                <option value="DEFAULTED">Defaulted</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Borrowings Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle>All Borrowings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              </div>
            ) : (
              <ResponsiveTable
                columns={columns}
                data={borrowings}
                emptyMessage="No borrowings found"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
