"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface LoanDetail {
  id: string;
  loanNumber: string;
  principal: string;
  interestRate: string;
  frequency: string;
  repaymentType: string;
  tenureInInstallments: number;
  installmentAmount: string;
  totalInterest: string;
  totalAmount: string;
  disbursedAmount: string;
  disbursedAt: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  closedAt: string | null;
  outstandingPrincipal: string;
  outstandingInterest: string;
  totalCollected: string;
  totalLateFees: string;
  totalPenalties: string;
  lateFeeRate: string;
  penaltyRate: string;
  gracePeriodDays: number;
  remarks: string | null;
  createdAt: string;
  customer: {
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
    agent: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    } | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  emiSchedules: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    principalDue: string;
    interestDue: string;
    totalDue: string;
    principalPaid: string;
    interestPaid: string;
    totalPaid: string;
    isPaid: boolean;
    paidAt: string | null;
  }>;
  collections: Array<{
    id: string;
    amount: string;
    principalAmount: string;
    interestAmount: string;
    collectionDate: string;
    receiptNumber: string | null;
    paymentMethod: string | null;
    remarks: string | null;
    agent: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  charges: Array<{
    id: string;
    type: string;
    amount: string;
    description: string | null;
    appliedAt: string;
  }>;
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLoanDetails();
  }, [params.id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loans/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setLoan(data.loan);
      } else {
        console.error("Failed to fetch loan details");
      }
    } catch (error) {
      console.error("Error fetching loan details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, remarks?: string) => {
    if (!loan) return;

    const confirmMessage = {
      approve: "Are you sure you want to approve this loan?",
      disburse: "Are you sure you want to disburse this loan?",
      close: "Are you sure you want to close this loan?",
      preclose: "Are you sure you want to preclose this loan?",
      default: "Are you sure you want to mark this loan as defaulted?",
    }[action];

    if (!confirm(confirmMessage)) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/loans/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, remarks }),
      });

      if (response.ok) {
        await fetchLoanDetails();
        alert("Loan updated successfully");
      } else {
        alert("Failed to update loan");
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      alert("An error occurred while updating the loan");
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(typeof value === "string" ? parseFloat(value) : value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "ACTIVE":
        return "success";
      case "CLOSED":
      case "PRECLOSED":
        return "default";
      case "DEFAULTED":
        return "danger";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-600">Loading loan details...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  if (!loan) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Loan Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The loan you are looking for does not exist or you don&apos;t have
              permission to view it.
            </p>
            <Link
              href="/admin/loans"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Loans
            </Link>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  const outstandingTotal =
    parseFloat(loan.outstandingPrincipal) +
    parseFloat(loan.outstandingInterest);
  const collectionPercentage =
    (parseFloat(loan.totalCollected) / parseFloat(loan.totalAmount)) * 100;

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/loans"
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Loan #{loan.loanNumber}
              </h1>
              <p className="text-gray-600">View and manage loan details</p>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(loan.status)}>
            {loan.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        {loan.status === "PENDING" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Loan
                </button>
                <button
                  onClick={() => handleAction("disburse")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <DollarSign className="h-4 w-4" />
                  Disburse Loan
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {loan.status === "ACTIVE" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleAction("close")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Close Loan
                </button>
                <button
                  onClick={() => handleAction("preclose")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Preclose Loan
                </button>
                <button
                  onClick={() => handleAction("default")}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  Mark as Defaulted
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Principal Amount
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(loan.principal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Total Collected
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(loan.totalCollected)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {collectionPercentage.toFixed(1)}% of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Outstanding
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(outstandingTotal)}
                  </p>
                  <p className="text-xs text-gray-500">
                    P: {formatCurrency(loan.outstandingPrincipal)} | I:{" "}
                    {formatCurrency(loan.outstandingInterest)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    EMI Amount
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(loan.installmentAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {loan.tenureInInstallments} installments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loan Details */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="text-base font-semibold text-gray-900">
                  {loan.customer.user.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Email
                </label>
                <p className="text-base text-gray-900">
                  {loan.customer.user.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Phone
                </label>
                <p className="text-base text-gray-900">
                  {loan.customer.user.phone || "N/A"}
                </p>
              </div>
              {loan.customer.agent && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Assigned Agent
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {loan.customer.agent.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {loan.customer.agent.email}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loan Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Loan Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Interest Rate
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {loan.interestRate}% per {loan.frequency.toLowerCase()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Total Amount
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {formatCurrency(loan.totalAmount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Total Interest
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {formatCurrency(loan.totalInterest)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Repayment Type
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {loan.repaymentType}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Start Date
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDate(loan.startDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    End Date
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDate(loan.endDate)}
                  </p>
                </div>
              </div>
              {loan.remarks && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Remarks
                  </label>
                  <p className="text-base text-gray-900">{loan.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* EMI Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              EMI Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      Principal
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      Interest
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      Total Due
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loan.emiSchedules.map((emi) => (
                    <tr
                      key={emi.id}
                      className={`border-b border-gray-100 ${
                        emi.isPaid ? "bg-green-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {emi.installmentNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(emi.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(emi.principalDue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(emi.interestDue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(emi.totalDue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(emi.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {emi.isPaid ? (
                          <Badge variant="success">Paid</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-600" />
              Payment History ({loan.collections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loan.collections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Receipt #
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Principal
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Interest
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Total Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Agent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.collections.map((collection) => (
                      <tr key={collection.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(collection.collectionDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {collection.receiptNumber || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(collection.principalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(collection.interestAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(collection.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {collection.paymentMethod || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {collection.agent.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charges */}
        {loan.charges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                Additional Charges ({loan.charges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.charges.map((charge) => (
                      <tr key={charge.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(charge.appliedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {charge.type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {charge.description || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(charge.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientDashboardLayout>
  );
}
