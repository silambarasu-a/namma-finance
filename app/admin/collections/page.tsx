"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Money } from "@/components/Money";
import Decimal from "decimal.js";
import { ClientDashboardLayout } from "@/components/ClientDashboardLayout";

interface Collection {
  id: string;
  collectionDate: string;
  amount: string;
  principalAmount: string;
  interestAmount: string;
  paymentMethod: string;
  receiptNumber: string;
  loan: {
    loanNumber: string;
    customer: {
      user: {
        name: string;
        email: string;
      };
    };
  };
  agent: {
    name: string;
  };
  createdAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRecordForm, setShowRecordForm] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [search]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const response = await fetch(`/api/collections?${params}`);
      const data = await response.json();

      if (response.ok) {
        setCollections(data.collections);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientDashboardLayout>
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600">Track all EMI collections</p>
        </div>
        <Link
          href="/admin/collections/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Record Collection
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, loan number, or receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">Total Collections</div>
          <div className="text-2xl font-bold text-gray-900">
            {collections.length}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-green-600">
            <Money
              amount={collections.reduce(
                (sum, c) => sum.plus(new Decimal(c.amount)),
                new Decimal(0)
              )}
            />
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-600">Today's Collections</div>
          <div className="text-2xl font-bold text-blue-600">
            <Money
              amount={collections
                .filter(
                  (c) =>
                    new Date(c.collectionDate).toDateString() ===
                    new Date().toDateString()
                )
                .reduce(
                  (sum, c) => sum.plus(new Decimal(c.amount)),
                  new Decimal(0)
                )}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Receipt #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Loan #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Principal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Interest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Agent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Method
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : collections.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No collections found
                </td>
              </tr>
            ) : (
              collections.map((collection) => (
                <tr key={collection.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {new Date(collection.collectionDate).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {collection.receiptNumber}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {collection.loan.customer.user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {collection.loan.customer.user.email}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {collection.loan.loanNumber}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                    <Money amount={new Decimal(collection.amount)} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <Money amount={new Decimal(collection.principalAmount)} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <Money amount={new Decimal(collection.interestAmount)} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {collection.agent.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                      {collection.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </ClientDashboardLayout>
  );
}
