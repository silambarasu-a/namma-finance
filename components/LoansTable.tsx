"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";

interface LoanData {
  id: string;
  loanNumber: string;
  customerName: string;
  customerEmail: string;
  principal: string;
  status: string;
  createdAt: string;
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
      render: (_: any, row: any) => (
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
      render: (value: string, row: LoanData) => (
        <Link
          href={`/admin/loans/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-900 hover:underline"
        >
          {value}
        </Link>
      ),
    },
    {
      header: "Principal",
      accessor: "principal",
      render: (value: string) => (
        <span className="font-semibold text-gray-900">
          <Money amount={new Decimal(value)} />
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (value: string) => (
        <Badge
          variant={
            value === "ACTIVE"
              ? "success"
              : value === "CLOSED"
              ? "default"
              : "warning"
          }
        >
          {value}
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
        <ResponsiveTable
          columns={columns}
          data={loans}
          emptyMessage="No loans found"
        />
      </CardContent>
    </Card>
  );
}
