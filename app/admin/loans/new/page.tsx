"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

      if (response.ok) {
        const data = await response.json();
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

      if (response.ok) {
        const data = await response.json();
        router.push("/admin/loans");
      } else {
        const data = await response.json();
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
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <Link
              href="/admin/loans"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Loans
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-3">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Loan</h1>
                <p className="text-gray-600">Create a loan for an existing customer</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>

                  <div className="space-y-2">
                    <Label htmlFor="customerId" required>
                      Customer
                    </Label>
                    <select
                      id="customerId"
                      required
                      value={formData.customerId}
                      onChange={(e) =>
                        setFormData({ ...formData, customerId: e.target.value })
                      }
                      className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.user.name} ({customer.user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Loan Terms Section */}
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">Loan Terms</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="principal" required>
                        Principal Amount (₹)
                      </Label>
                      <Input
                        id="principal"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.principal}
                        onChange={(e) =>
                          setFormData({ ...formData, principal: e.target.value })
                        }
                        placeholder="100000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interestRate" required>
                        Annual Interest Rate (%)
                      </Label>
                      <Input
                        id="interestRate"
                        type="number"
                        required
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.interestRate}
                        onChange={(e) =>
                          setFormData({ ...formData, interestRate: e.target.value })
                        }
                        placeholder="12.0"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="frequency" required>
                        Repayment Frequency
                      </Label>
                      <select
                        id="frequency"
                        required
                        value={formData.frequency}
                        onChange={(e) =>
                          setFormData({ ...formData, frequency: e.target.value })
                        }
                        className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="HALF_YEARLY">Half-Yearly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tenureInstallments" required>
                        Tenure (Number of Installments)
                      </Label>
                      <Input
                        id="tenureInstallments"
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
                        placeholder="12"
                      />
                    </div>
                  </div>
                </div>

                {/* Disbursement & Charges Section */}
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">Disbursement & Charges</h3>

                  <div className="space-y-2">
                    <Label htmlFor="disbursedAmount">
                      Disbursed Amount (₹)
                    </Label>
                    <Input
                      id="disbursedAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.disbursedAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, disbursedAmount: e.target.value })
                      }
                      placeholder="Leave empty to equal principal"
                    />
                    <p className="text-xs text-gray-500">
                      If different from principal (after deducting charges)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Charges/Fees</Label>
                    {formData.charges.map((charge, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          value={charge.type}
                          onChange={(e) => updateCharge(index, "type", e.target.value)}
                          className="flex h-11 w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="PROCESSING_FEE">Processing Fee</option>
                          <option value="STAMP_DUTY">Stamp Duty</option>
                          <option value="DOCUMENTATION">Documentation</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={charge.amount}
                          onChange={(e) =>
                            updateCharge(index, "amount", e.target.value)
                          }
                          placeholder="Amount"
                          className="w-1/2"
                        />
                        {formData.charges.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeCharge(index)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addCharge}
                      className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      + Add Another Charge
                    </button>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/loans")}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Loan"}
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
