"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Collection {
  id: string;
  collectionDate: string;
  amount: string;
  principalAmount: string;
  interestAmount: string;
  paymentMethod: string;
  receiptNumber: string;
  loan: {
    loanNumber: string;
    customer: {
      user: {
        name: string;
        email: string;
      };
    };
  };
  agent: {
    name: string;
  };
  createdAt: string;
  [key: string]: unknown;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRecordForm, setShowRecordForm] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [search]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const response = await fetch(`/api/collections?${params}`);

      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: "Date",
      accessor: "collectionDate",
      render: (_: unknown, row: Collection) =>
        new Date(row.collectionDate).toLocaleDateString(),
    },
    {
      header: "Receipt #",
      accessor: "receiptNumber",
      mobileLabel: "Receipt",
      render: (_: unknown, row: Collection) => (
        <span className="font-medium">{row.receiptNumber}</span>
      ),
    },
    {
      header: "Customer",
      accessor: "customer",
      render: (_: unknown, row: Collection) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.loan.customer.user.name}
          </div>
          <div className="text-sm text-gray-500">
            {row.loan.customer.user.email}
          </div>
        </div>
      ),
    },
    {
      header: "Loan #",
      accessor: "loanNumber",
      mobileLabel: "Loan",
      render: (_: unknown, row: Collection) => row.loan.loanNumber,
    },
    {
      header: "Amount",
      accessor: "amount",
      render: (_: unknown, row: Collection) => (
        <span className="font-medium text-green-600">
          <Money amount={new Decimal(row.amount)} />
        </span>
      ),
    },
    {
      header: "Principal",
      accessor: "principalAmount",
      render: (_: unknown, row: Collection) => (
        <Money amount={new Decimal(row.principalAmount)} />
      ),
    },
    {
      header: "Interest",
      accessor: "interestAmount",
      render: (_: unknown, row: Collection) => (
        <Money amount={new Decimal(row.interestAmount)} />
      ),
    },
    {
      header: "Agent",
      accessor: "agent",
      render: (_: unknown, row: Collection) => row.agent.name,
    },
    {
      header: "Method",
      accessor: "paymentMethod",
      render: (_: unknown, row: Collection) => (
        <Badge variant="outline">{row.paymentMethod}</Badge>
      ),
    },
  ];

  return (
    <ClientDashboardLayout>
      <div className="space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
            <p className="text-gray-600">Track all EMI collections</p>
          </div>
          <Link
            href="/admin/collections/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Record Collection
          </Link>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by customer, loan number, or receipt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Total Collections</div>
              <div className="text-2xl font-bold text-gray-900">
                {collections.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-2xl font-bold text-green-600">
                <Money
                  amount={collections.reduce(
                    (sum, c) => sum.plus(new Decimal(c.amount)),
                    new Decimal(0)
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600">Today&apos;s Collections</div>
              <div className="text-2xl font-bold text-blue-600">
                <Money
                  amount={collections
                    .filter(
                      (c) =>
                        new Date(c.collectionDate).toDateString() ===
                        new Date().toDateString()
                    )
                    .reduce(
                      (sum, c) => sum.plus(new Decimal(c.amount)),
                      new Decimal(0)
                    )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <ResponsiveTable<Collection>
                columns={columns}
                data={collections}
                emptyMessage="No collections found"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
