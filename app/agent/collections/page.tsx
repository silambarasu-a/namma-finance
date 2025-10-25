"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AgentCollectionsPage() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600">Record and view EMI collections</p>
        </div>
        <Link
          href="/admin/collections/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Record Collection
        </Link>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">
            Use the admin collections page to record payments
          </p>
          <Link
            href="/admin/collections"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Go to Collections →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
