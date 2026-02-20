"use client";

interface ImportPreviewProps {
  rows: Record<string, unknown>[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreview({ rows, onConfirm, onCancel }: ImportPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {rows.length} row{rows.length !== 1 ? "s" : ""} ready to import
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.slice(0, 100).map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                    {String(row.sku ?? "-")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                    {String(row.name ?? "-")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                    {String(row.category ?? "-")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                    {String(row.quantity ?? "-")}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">
                    {String(row.costPerUnit ?? "-")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 100 && (
          <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500">
            Showing first 100 of {rows.length} rows
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
        >
          Confirm Import
        </button>
      </div>
    </div>
  );
}
