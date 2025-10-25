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
          href={`/agent/loans/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-900 hover:underline"
        >
          {value}
        </Link>
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
      header: "Contact",
      accessor: "customerPhone",
      render: (value: string | null) => (
        <span className="text-gray-600">
          {value || "—"}
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
        <ResponsiveTable
          columns={columns}
          data={loans}
          emptyMessage="No active loans found"
        />
      </CardContent>
    </Card>
  );
}
