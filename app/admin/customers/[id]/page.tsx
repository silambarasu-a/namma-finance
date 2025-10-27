"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  UserCheck,
} from "lucide-react";

interface CustomerData {
  customer: {
    id: string;
    userId: string;
    dob: string | null;
    idProof: string | null;
    kycStatus: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      createdAt: string;
    };
    loans: Array<{
      id: string;
      loanNumber: string;
      principal: string;
      status: string;
      outstandingPrincipal: string;
      outstandingInterest: string;
      totalCollected: string;
      nextEmi?: {
        emiAmount: string;
        dueDate: string;
      };
    }>;
    agent: {
      id: string;
      name: string;
      email: string;
      phone: string;
    } | null;
  };
  statistics: {
    totalLoans: number;
    activeLoans: number;
    totalBorrowed: string;
    totalOutstanding: string;
    totalPaid: string;
    overdueEmis: number;
  };
  upcomingEmis: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    totalDue: string;
    loanNumber?: string;
    emiNumber?: number;
    emiAmount?: string;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${params.id}`);

      if (!response.ok) {
        router.push("/admin/customers");
        return;
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching customer details:", error);
      router.push("/admin/customers");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  if (loading || !data) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  const { customer, statistics, upcomingEmis } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "PRECLOSED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DEFAULTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/customers"
              className="rounded-lg border border-gray-300 bg-white p-2 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {customer.user.name}
              </h1>
              <p className="text-sm text-gray-600">Customer Details</p>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Full Name</div>
                  <div className="mt-1 text-base font-semibold text-gray-900">
                    {customer.user.name}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Email</div>
                  <div className="mt-1 text-base text-gray-900">
                    {customer.user.email.includes("@noreply.local") ? (
                      <span className="text-gray-500 italic">Not provided</span>
                    ) : (
                      customer.user.email
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Phone</div>
                  <div className="mt-1 text-base font-semibold text-gray-900">
                    {customer.user.phone}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Date of Birth</div>
                  <div className="mt-1 text-base text-gray-900">
                    {customer.dob
                      ? new Date(customer.dob).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not provided"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <CheckCircle className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">KYC Status</div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getKycStatusColor(
                        customer.kycStatus
                      )}`}
                    >
                      {customer.kycStatus}
                    </span>
                  </div>
                </div>
              </div>

              {customer.agent && (
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-teal-100 p-2">
                    <UserCheck className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Assigned Agent</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">
                      {customer.agent.name}
                    </div>
                    <div className="text-sm text-gray-600">{customer.agent.phone}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Loans"
            value={statistics.totalLoans}
            subtitle={`${statistics.activeLoans} active`}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Total Borrowed"
            value={<Money amount={new Decimal(statistics.totalBorrowed)} />}
            subtitle="Lifetime"
            icon={TrendingUp}
            variant="default"
          />
          <StatCard
            title="Total Paid"
            value={<Money amount={new Decimal(statistics.totalPaid)} />}
            subtitle="Collected"
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Outstanding"
            value={<Money amount={new Decimal(statistics.totalOutstanding)} />}
            subtitle={`${statistics.overdueEmis} overdue EMIs`}
            icon={statistics.overdueEmis > 0 ? AlertCircle : CheckCircle}
            variant={statistics.overdueEmis > 0 ? "danger" : "warning"}
          />
        </div>

        {/* Upcoming EMIs */}
        {upcomingEmis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming EMIs (Next 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEmis.map((emi) => (
                  <div
                    key={emi.id}
                    className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {emi.loanNumber} - EMI #{emi.emiNumber}
                        </div>
                        <div className="text-sm text-gray-600">
                          Due:{" "}
                          {new Date(emi.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        <Money amount={new Decimal(emi.emiAmount || emi.totalDue)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loans Table */}
        <Card>
          <CardHeader>
            <CardTitle>Loan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Loan Number
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Principal
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Outstanding
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Collected
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Next EMI
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customer.loans.map((loan) => {
                    const outstanding = new Decimal(loan.outstandingPrincipal).plus(
                      new Decimal(loan.outstandingInterest)
                    );
                    return (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="font-medium text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            {loan.loanNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          <Money amount={new Decimal(loan.principal)} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                              loan.status
                            )}`}
                          >
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                          <Money amount={outstanding} />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          <Money amount={new Decimal(loan.totalCollected)} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {loan.nextEmi ? (
                            <div>
                              <div className="font-medium">
                                <Money amount={new Decimal(loan.nextEmi.emiAmount)} />
                              </div>
                              <div className="text-xs text-gray-600">
                                {new Date(loan.nextEmi.dueDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="text-blue-600 hover:text-blue-900 hover:underline"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {customer.loans.length === 0 && (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No loans found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
