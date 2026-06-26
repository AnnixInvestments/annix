"use client";

import { BatchLookupPanel } from "@/app/stock-control/components/quality/BatchLookupPanel";

export default function BatchLookupPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Batch Lookup</h1>
      </div>
      <BatchLookupPanel />
    </div>
  );
}
