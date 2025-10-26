"use client";

import { useEffect, useState } from "react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Calendar,
  X,
} from "lucide-react";

interface Investment {
  id: string;
  amount: string;
  source: string;
  investmentDate: string;
  description: string | null;
  createdAt: string;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalInvestment, setTotalInvestment] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    investmentDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/investments");
      if (response.ok) {
        const data = await response.json();
        setInvestments(data.investments || []);
        setTotalInvestment(data.totalInvestment || "0.00");
      }
    } catch (error) {
      console.error("Error fetching investments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          source: formData.source,
          investmentDate: new Date(formData.investmentDate).toISOString(),
          description: formData.description || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowAddForm(false);
        setFormData({
          amount: "",
          source: "",
          investmentDate: new Date().toISOString().split("T")[0],
          description: "",
        });
        fetchInvestments();
      } else {
        setError(data.error || "Failed to record investment");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setFormLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investment Capital</h1>
            <p className="text-gray-600">Track and manage investment capital</p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Investment
          </button>
        </div>

        {/* Total Investment Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title="Total Investment"
            value={formatCurrency(totalInvestment)}
            subtitle={`${investments.length} investments recorded`}
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="Latest Investment"
            value={investments.length > 0 ? formatCurrency(investments[0].amount) : "₹0"}
            subtitle={investments.length > 0 ? formatDate(investments[0].investmentDate) : "No investments yet"}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Average Investment"
            value={formatCurrency(
              investments.length > 0
                ? parseFloat(totalInvestment) / investments.length
                : 0
            )}
            subtitle="Per entry"
            icon={Calendar}
            variant="default"
          />
        </div>

        {/* Add Investment Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Record New Investment</CardTitle>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount" required>
                        Investment Amount (₹)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        placeholder="100000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="investmentDate" required>
                        Investment Date
                      </Label>
                      <Input
                        id="investmentDate"
                        type="date"
                        required
                        value={formData.investmentDate}
                        onChange={(e) =>
                          setFormData({ ...formData, investmentDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source" required>
                      Source of Investment
                    </Label>
                    <Input
                      id="source"
                      type="text"
                      required
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value })
                      }
                      placeholder="e.g., Personal Savings, Bank Loan, Investor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      placeholder="Optional notes about this investment..."
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      disabled={formLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? "Recording..." : "Record Investment"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Investments List */}
        <Card>
          <CardHeader>
            <CardTitle>Investment History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              </div>
            ) : investments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No investments recorded yet</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Investment
                </button>
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
                        Source
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Recorded On
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.map((investment) => (
                      <tr key={investment.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(investment.investmentDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {investment.source}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(investment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {investment.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(investment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900" colSpan={2}>
                        Total Investment
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                        {formatCurrency(totalInvestment)}
                      </td>
                      <td className="px-4 py-3" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
