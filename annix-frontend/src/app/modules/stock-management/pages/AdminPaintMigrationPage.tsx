"use client";

import { useStockManagementConfig } from "../provider/useStockManagementConfig";

export function AdminPaintMigrationPage() {
  const config = useStockManagementConfig();

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{config.label("admin.paintMigration")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          One-off AI-assisted classification of legacy stock items as paint vs consumable
        </p>
      </header>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-sm text-blue-900">
        <p className="font-semibold mb-2">Migration tool placeholder</p>
        <p>
          The PaintClassificationService is wired up on the backend. This admin page will be built
          out as part of phase 12 (cutover), when we run the actual migration to split legacy
          stock_items into ConsumableProduct vs PaintProduct.
        </p>
        <p className="mt-3">
          Until then, the classification can be triggered programmatically via the
          PaintClassificationService.classifyBatchWithAi method, which combines rule-based scoring
          with a Gemini fallback for ambiguous items.
        </p>
      </div>
    </div>
  );
}

export default AdminPaintMigrationPage;
