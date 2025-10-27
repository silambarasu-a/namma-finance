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
  customerPhone: string | null;
  outstandingPrincipal: string;
  [key: string]: unknown;
}

interface AgentLoansTableProps {
  loans: LoanData[];
  showViewAll?: boolean;
  viewAllHref?: string;
}

export function AgentLoansTable({ loans, showViewAll = false, viewAllHref = "/agent/customers" }: AgentLoansTableProps) {
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
          href={`/agent/loans/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-900 hover:underline"
        >
          {String(value)}
        </Link>
      ),
    },
    {
      header: "Outstanding",
      accessor: "outstandingPrincipal",
      render: (value: unknown) => (
        <span className="font-semibold text-red-600">
          <Money amount={new Decimal(String(value))} />
        </span>
      ),
    },
    {
      header: "Contact",
      accessor: "customerPhone",
      render: (value: unknown) => (
        <span className="text-gray-600">
          {value ? String(value) : "—"}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Active Loans</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveTable<LoanData>
          columns={columns}
          data={loans}
          emptyMessage="No active loans found"
        />
      </CardContent>
    </Card>
  );
}
