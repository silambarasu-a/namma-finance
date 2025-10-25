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
  principal: string;
  interestRate: string;
  outstandingPrincipal: string;
  status: string;
}

interface CustomerLoansTableProps {
  loans: LoanData[];
  totalLoans: number;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export function CustomerLoansTable({
  loans,
  totalLoans,
  showViewAll = false,
  viewAllHref = "/customer/loans"
}: CustomerLoansTableProps) {
  const columns = [
    {
      header: "Loan Number",
      accessor: "loanNumber",
      mobileLabel: "Loan #",
      render: (value: string, row: LoanData) => (
        <Link
          href={`/customer/loans/${row.id}`}
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
        <Money amount={new Decimal(value)} />
      ),
    },
    {
      header: "Interest Rate",
      accessor: "interestRate",
      render: (value: string) => (
        <span className="text-gray-900">{value}%</span>
      ),
    },
    {
      header: "Outstanding",
      accessor: "outstandingPrincipal",
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
  ];

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Loans</CardTitle>
          {showViewAll && totalLoans > 5 && (
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
