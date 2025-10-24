"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";

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
    </ClientDashboardLayout>
  );
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
      const data = await response.json();
      if (response.ok) {
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

      const data = await response.json();

      if (response.ok) {
        router.push("/admin/collections");
      } else {
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
        {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/collections"
          className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Collections
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Record Collection</h1>
        <p className="text-gray-600">Record an EMI payment</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loan Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select Loan *
            </label>
            <select
              required
              value={formData.loanId}
              onChange={(e) => handleLoanChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 font-medium text-blue-900">Loan Details</h3>
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

          {/* Collection Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Collection Date *
            </label>
            <input
              type="date"
              required
              value={formData.collectionDate}
              onChange={(e) =>
                setFormData({ ...formData, collectionDate: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="10000"
            />
            <p className="mt-1 text-sm text-gray-500">
              Amount will be allocated to interest first, then principal
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payment Method *
            </label>
            <select
              required
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional notes..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Recording..." : "Record Collection"}
            </button>
            <Link
              href="/admin/collections"
              className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
      </div>
    </ClientDashboardLayout>
  );
}
