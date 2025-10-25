"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Loan {
  id: string;
  loanNumber: string;
  outstandingPrincipal: string;
  outstandingInterest: string;
  customer: {
    user: {
      name: string;
      email: string;
    };
  };
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const [formData, setFormData] = useState({
    loanId: "",
    amount: "",
    collectionDate: new Date().toISOString().split("T")[0],
    paymentMethod: "CASH",
    notes: "",
  });

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const fetchActiveLoans = async () => {
    try {
      const response = await fetch("/api/loans?status=ACTIVE");

      if (response.ok) {
        const data = await response.json();
        setLoans(data.loans);
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
    }
  };

  const handleLoanChange = (loanId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    setSelectedLoan(loan || null);
    setFormData({ ...formData, loanId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: formData.loanId,
          amount: parseFloat(formData.amount),
          collectionDate: new Date(formData.collectionDate),
          paymentMethod: formData.paymentMethod,
          notes: formData.notes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push("/admin/collections");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to record collection");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientDashboardLayout>
      <div className="p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <Link
              href="/admin/collections"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Collections
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Record Collection</h1>
                <p className="text-gray-600">Record an EMI payment</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Collection Information</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Loan Selection Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>

                  <div className="space-y-2">
                    <Label htmlFor="loanId" required>
                      Select Loan
                    </Label>
                    <select
                      id="loanId"
                      required
                      value={formData.loanId}
                      onChange={(e) => handleLoanChange(e.target.value)}
                      className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select an active loan</option>
                      {loans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.loanNumber} - {loan.customer.user.name} (Outstanding: ₹
                          {parseFloat(loan.outstandingPrincipal).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Loan Details */}
                  {selectedLoan && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h3 className="mb-2 font-semibold text-blue-900">Loan Details</h3>
                      <div className="space-y-1 text-sm text-blue-800">
                        <div>
                          <span className="font-medium">Customer:</span>{" "}
                          {selectedLoan.customer.user.name}
                        </div>
                        <div>
                          <span className="font-medium">Outstanding Principal:</span> ₹
                          {parseFloat(selectedLoan.outstandingPrincipal).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Outstanding Interest:</span> ₹
                          {parseFloat(selectedLoan.outstandingInterest).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Total Outstanding:</span> ₹
                          {(
                            parseFloat(selectedLoan.outstandingPrincipal) +
                            parseFloat(selectedLoan.outstandingInterest)
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Information Section */}
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="collectionDate" required>
                        Collection Date
                      </Label>
                      <Input
                        id="collectionDate"
                        type="date"
                        required
                        value={formData.collectionDate}
                        onChange={(e) =>
                          setFormData({ ...formData, collectionDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" required>
                        Amount (₹)
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
                        placeholder="10000"
                      />
                      <p className="text-xs text-gray-500">
                        Amount will be allocated to interest first, then principal
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" required>
                      Payment Method
                    </Label>
                    <select
                      id="paymentMethod"
                      required
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentMethod: e.target.value })
                      }
                      className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/collections")}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Recording..." : "Record Collection"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientDashboardLayout>
  );
}
