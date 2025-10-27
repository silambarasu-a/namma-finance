"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";

interface Loan {
  id: string;
  loanNumber: string;
  principal: string;
  interestRate: string;
  status: string;
  outstandingPrincipal: string;
  customer: {
    user: {
      name: string;
      email: string;
    };
  };
  [key: string]: unknown;
}

interface AdminLoansTableProps {
  loans: Loan[];
  loading: boolean;
}

export function AdminLoansTable({ loans, loading }: AdminLoansTableProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "CLOSED":
        return "outline";
      case "PRECLOSED":
        return "info";
      case "DEFAULTED":
        return "danger";
      default:
        return "warning";
    }
  };

  const columns = [
    {
      header: "Loan #",
      accessor: "loanNumber",
      mobileLabel: "Loan Number",
      render: (value: unknown, row: Loan) => (
        <Link
          href={`/admin/loans/${row.id}`}
          className="font-medium text-blue-600 hover:text-blue-900 hover:underline"
        >
          {String(value)}
        </Link>
      ),
    },
    {
      header: "Customer",
      accessor: "customer",
      render: (_: unknown, row: Loan) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.customer.user.name}
          </div>
          <div className="text-sm text-gray-500">{row.customer.user.email}</div>
        </div>
      ),
    },
    {
      header: "Principal",
      accessor: "principal",
      render: (value: unknown) => (
        <Money amount={new Decimal(String(value))} />
      ),
    },
    {
      header: "Interest Rate",
      accessor: "interestRate",
      render: (value: unknown) => (
        <span className="text-gray-900">{String(value)}%</span>
      ),
    },
    {
      header: "Outstanding",
      accessor: "outstandingPrincipal",
      render: (value: unknown) => (
        <span className="font-medium text-red-600">
          <Money amount={new Decimal(String(value))} />
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (value: unknown) => (
        <Badge variant={getStatusVariant(String(value))}>{String(value)}</Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "id",
      render: (value: unknown) => (
        <Link
          href={`/admin/loans/${String(value)}`}
          className="text-blue-600 hover:text-blue-900"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : (
          <ResponsiveTable<Loan>
            columns={columns}
            data={loans}
            emptyMessage="No loans found"
          />
        )}
      </CardContent>
    </Card>
  );
}
