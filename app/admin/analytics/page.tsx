"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { MonthlyTrendData } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  Wallet,
} from "lucide-react";

interface Analytics {
  period: string;
  totalLoans: number;
  activeLoans: number;
  pendingLoans: number;
  closedLoans: number;
  defaultedLoans: number;
  overdueLoans: number;
  totalDisbursed: string;
  totalCollected: string;
  principalCollected: string;
  interestCollected: string;
  totalOutstanding: string;
  totalOutstandingPrincipal: string;
  totalOutstandingInterest: string;
  overdueAmount: string;
  totalLateFees: string;
  totalPenalties: string;
  expectedInterest: string;
  profitLoss: string;
  collectionRate: string;
  totalCustomers: number;
  totalAgents: number;
  totalCollections: number;
  investmentCapital: string;
  borrowingsCapital: string;
  totalCapital: string;
  capitalBalance: string;
  hasCapitalSurplus: boolean;
  capitalUtilization: string;
  monthlyTrend: MonthlyTrendData[];
  statusBreakdown: {
    active: number;
    pending: number;
    closed: number;
    defaulted: number;
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, [period, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let url = `/api/analytics?period=${period}`;

      if (startDate && endDate) {
        url = `/api/analytics?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading || !analytics) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  const profitLossNum = parseFloat(analytics.profitLoss);
  const isProfitable = profitLossNum >= 0;

  // Prepare chart data
  const monthlyTrendData = analytics.monthlyTrend.map((item: Record<string, unknown>) => ({
    name: new Date(String(item.month)).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    }),
    month: new Date(String(item.month)).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    }),
    disbursed: parseFloat(String(item.total_disbursed || "0")),
    collected: parseFloat(String(item.total_collected || "0")),
    loans: parseInt(String(item.loan_count || "0")),
  }));

  const statusPieData = [
    {
      name: "Active",
      value: analytics.statusBreakdown.active,
      color: "#10b981",
    },
    {
      name: "Pending",
      value: analytics.statusBreakdown.pending,
      color: "#f59e0b",
    },
    {
      name: "Closed",
      value: analytics.statusBreakdown.closed,
      color: "#6b7280",
    },
    {
      name: "Defaulted",
      value: analytics.statusBreakdown.defaulted,
      color: "#ef4444",
    },
  ];

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive business insights and metrics</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/admin/investments"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <DollarSign className="h-4 w-4" />
              Manage Investments
            </Link>
          </div>
        </div>

        {/* Period Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Period:</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {["today", "week", "month", "quarter", "half-year", "year", "all"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      period === p && !startDate
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1).replace("-", " ")}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Start Date"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="End Date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capital Management Section - Prominent */}
        <div className="rounded-xl border-2 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 shadow-lg">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Capital Management</h2>
            <p className="text-sm text-gray-600">Track your investment capital and utilization</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow-sm border border-indigo-100">
              <div className="text-sm font-medium text-gray-600">Own Investment</div>
              <div className="mt-2 text-2xl font-bold text-indigo-600">
                {formatCurrency(analytics.investmentCapital)}
              </div>
              <div className="mt-1 text-xs text-gray-500">Capital invested</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border border-purple-100">
              <div className="text-sm font-medium text-gray-600">Borrowings</div>
              <div className="mt-2 text-2xl font-bold text-purple-600">
                {formatCurrency(analytics.borrowingsCapital)}
              </div>
              <div className="mt-1 text-xs text-gray-500">External capital</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border border-blue-100">
              <div className="text-sm font-medium text-gray-600">Total Capital</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">
                {formatCurrency(analytics.totalCapital)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {formatCurrency(analytics.totalDisbursed)} disbursed ({analytics.capitalUtilization}%)
              </div>
            </div>
            <div className={`rounded-lg p-5 shadow-sm border-2 ${
              analytics.hasCapitalSurplus
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-600">
                  {analytics.hasCapitalSurplus ? "Capital Surplus" : "Capital Deficit"}
                </div>
                {analytics.hasCapitalSurplus ? (
                  <div className="rounded-full bg-green-100 p-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <div className="rounded-full bg-orange-100 p-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                )}
              </div>
              <div className={`mt-2 text-2xl font-bold ${
                analytics.hasCapitalSurplus ? 'text-green-600' : 'text-orange-600'
              }`}>
                {formatCurrency(analytics.capitalBalance)}
              </div>
              <div className="mt-1 text-xs font-medium">
                {analytics.hasCapitalSurplus ? (
                  <span className="text-green-700">✓ Available for new loans</span>
                ) : (
                  <span className="text-orange-700">⚠ Over-disbursed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Key Financial Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Disbursed"
            value={formatCurrency(analytics.totalDisbursed)}
            subtitle="Loans distributed"
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="Total Collected"
            value={formatCurrency(analytics.totalCollected)}
            subtitle={`${analytics.collectionRate}% collection rate`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Outstanding Amount"
            value={formatCurrency(analytics.totalOutstanding)}
            subtitle={`${analytics.activeLoans} active loans`}
            icon={FileText}
            variant="warning"
          />
          <StatCard
            title={isProfitable ? "Profit" : "Loss"}
            value={formatCurrency(Math.abs(profitLossNum))}
            subtitle="Interest + Fees earned"
            icon={isProfitable ? TrendingUp : TrendingDown}
            variant={isProfitable ? "success" : "danger"}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Overdue Amount"
            value={formatCurrency(analytics.overdueAmount)}
            subtitle={`${analytics.overdueLoans} overdue loans`}
            icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            title="Late Fees"
            value={formatCurrency(analytics.totalLateFees)}
            subtitle="Penalty collected"
            icon={DollarSign}
            variant="default"
          />
          <StatCard
            title="Active Loans"
            value={analytics.activeLoans.toString()}
            subtitle={`${analytics.totalLoans} total loans`}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Customers"
            value={analytics.totalCustomers.toString()}
            subtitle={`${analytics.totalAgents} agents`}
            icon={Users}
            variant="default"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend (Last 12 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={monthlyTrendData}
                xKey="month"
                lines={[
                  { key: "disbursed", color: "#3b82f6", name: "Disbursed" },
                  { key: "collected", color: "#10b981", name: "Collected" },
                ]}
                height={350}
              />
            </CardContent>
          </Card>

          {/* Loan Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart data={statusPieData} height={350} />
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={[
                {
                  name: "Current",
                  Principal: parseFloat(analytics.totalOutstandingPrincipal),
                  Interest: parseFloat(analytics.totalOutstandingInterest),
                },
              ]}
              xKey="name"
              bars={[
                { key: "Principal", color: "#3b82f6", name: "Principal" },
                { key: "Interest", color: "#10b981", name: "Interest" },
              ]}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Detailed Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Total Loans</td>
                    <td className="py-3 text-sm text-right text-gray-600">{analytics.totalLoans}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Active Loans</td>
                    <td className="py-3 text-sm text-right text-gray-600">{analytics.activeLoans}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Pending Approvals</td>
                    <td className="py-3 text-sm text-right text-gray-600">{analytics.pendingLoans}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Closed Loans</td>
                    <td className="py-3 text-sm text-right text-gray-600">{analytics.closedLoans}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Defaulted Loans</td>
                    <td className="py-3 text-sm text-right text-red-600 font-semibold">{analytics.defaultedLoans}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-3 text-sm font-medium text-gray-900">Principal Collected</td>
                    <td className="py-3 text-sm text-right text-blue-700 font-semibold">{formatCurrency(analytics.principalCollected)}</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="py-3 text-sm font-medium text-gray-900">Interest Collected</td>
                    <td className="py-3 text-sm text-right text-green-700 font-semibold">{formatCurrency(analytics.interestCollected)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Late Fees</td>
                    <td className="py-3 text-sm text-right text-gray-600">{formatCurrency(analytics.totalLateFees)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Penalties</td>
                    <td className="py-3 text-sm text-right text-gray-600">{formatCurrency(analytics.totalPenalties)}</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="py-3 text-sm font-medium text-gray-900">Profit (Interest + Fees + Penalties)</td>
                    <td className={`py-3 text-sm text-right font-bold ${isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(Math.abs(profitLossNum))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Expected Interest</td>
                    <td className="py-3 text-sm text-right text-gray-600">{formatCurrency(analytics.expectedInterest)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Collection Rate</td>
                    <td className="py-3 text-sm text-right text-gray-600">{analytics.collectionRate}%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-sm font-medium text-gray-900">Total Collections Made</td>
                    <td className="py-3 text-sm text-right text-gray-600">{analytics.totalCollections}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
