"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";

interface Customer {
  id: string;
  user: {
    name: string;
    email: string;
  };
}

export default function NewLoanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    customerId: "",
    principal: "",
    interestRate: "",
    frequency: "MONTHLY",
    tenureInstallments: "",
    disbursedAmount: "",
    charges: [{ type: "PROCESSING_FEE", amount: "" }],
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Filter out empty charges
      const validCharges = formData.charges.filter(
        (c) => c.amount && parseFloat(c.amount) > 0
      );

      const response = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          principal: parseFloat(formData.principal),
          interestRate: parseFloat(formData.interestRate),
          tenureInstallments: parseInt(formData.tenureInstallments),
          disbursedAmount: formData.disbursedAmount
            ? parseFloat(formData.disbursedAmount)
            : undefined,
          charges: validCharges.map((c) => ({
            type: c.type,
            amount: parseFloat(c.amount),
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/admin/loans");
      } else {
        setError(data.error || "Failed to create loan");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const addCharge = () => {
    setFormData({
      ...formData,
      charges: [...formData.charges, { type: "PROCESSING_FEE", amount: "" }],
    });
  };

  const removeCharge = (index: number) => {
    setFormData({
      ...formData,
      charges: formData.charges.filter((_, i) => i !== index),
    });
  };

  const updateCharge = (
    index: number,
    field: "type" | "amount",
    value: string
  ) => {
    const newCharges = [...formData.charges];
    newCharges[index][field] = value;
    setFormData({ ...formData, charges: newCharges });
  };

  return (
    <ClientDashboardLayout>
      <div className="p-8">
        {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/loans"
          className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Loans
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Loan</h1>
        <p className="text-gray-600">Create a loan for an existing customer</p>
      </div>

      {/* Form */}
      <div className="max-w-3xl rounded-lg bg-white p-6 shadow">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Customer *
            </label>
            <select
              required
              value={formData.customerId}
              onChange={(e) =>
                setFormData({ ...formData, customerId: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.user.name} ({customer.user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Principal Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Principal Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.principal}
              onChange={(e) =>
                setFormData({ ...formData, principal: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="100000"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Annual Interest Rate (%) *
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.01"
              value={formData.interestRate}
              onChange={(e) =>
                setFormData({ ...formData, interestRate: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="12.0"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Repayment Frequency *
            </label>
            <select
              required
              value={formData.frequency}
              onChange={(e) =>
                setFormData({ ...formData, frequency: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half-Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {/* Tenure */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tenure (Number of Installments) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.tenureInstallments}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tenureInstallments: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="12"
            />
          </div>

          {/* Disbursed Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Disbursed Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.disbursedAmount}
              onChange={(e) =>
                setFormData({ ...formData, disbursedAmount: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Leave empty to equal principal"
            />
            <p className="mt-1 text-sm text-gray-500">
              If different from principal (after deducting charges)
            </p>
          </div>

          {/* Charges */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Charges/Fees
            </label>
            {formData.charges.map((charge, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <select
                  value={charge.type}
                  onChange={(e) => updateCharge(index, "type", e.target.value)}
                  className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="PROCESSING_FEE">Processing Fee</option>
                  <option value="STAMP_DUTY">Stamp Duty</option>
                  <option value="DOCUMENTATION">Documentation</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={charge.amount}
                  onChange={(e) =>
                    updateCharge(index, "amount", e.target.value)
                  }
                  placeholder="Amount"
                  className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {formData.charges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCharge(index)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addCharge}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              + Add Another Charge
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Creating..." : "Create Loan"}
            </button>
            <Link
              href="/admin/loans"
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
