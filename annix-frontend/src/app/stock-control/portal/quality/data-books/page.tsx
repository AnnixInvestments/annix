"use client";

import { DataBooksList } from "@/app/stock-control/components/quality/DataBooksList";

export default function DataBooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Job Card Data Books</h1>
      </div>
      <DataBooksList />
    </div>
  );
}
