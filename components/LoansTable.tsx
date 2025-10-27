"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";
import { Loan } from "@/types";

interface LoanData {
  id: string;
  loanNumber: string;
  customerName: string;
  customerEmail: string;
  principal: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

interface LoansTableProps {
  loans: LoanData[];
  showViewAll?: boolean;
  viewAllHref?: string;
}

export function LoansTable({ loans, showViewAll = false, viewAllHref = "/admin/loans" }: LoansTableProps) {
  const columns = [
    {
      header: "Customer",
      accessor: "customerName",
      render: (_: unknown, row: LoanData) => (
        <div>
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-sm text-gray-500">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      header: "Loan Number",
      accessor: "loanNumber",
      mobileLabel: "Loan #",
      render: (value: unknown, row: LoanData) => (
        <Link
          href={`/admin/loans/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-900 hover:underline"
        >
          {String(value)}
        </Link>
      ),
    },
    {
      header: "Principal",
      accessor: "principal",
      render: (value: unknown) => (
        <span className="font-semibold text-gray-900">
          <Money amount={new Decimal(String(value))} />
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (value: unknown) => (
        <Badge
          variant={
            String(value) === "ACTIVE"
              ? "success"
              : String(value) === "CLOSED"
              ? "default"
              : "warning"
          }
        >
          {String(value)}
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
  ];

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Loans</CardTitle>
          {showViewAll && (
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveTable<LoanData>
          columns={columns}
          data={loans}
          emptyMessage="No loans found"
        />
      </CardContent>
    </Card>
  );
}
