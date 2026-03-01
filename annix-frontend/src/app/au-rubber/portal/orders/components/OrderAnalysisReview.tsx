"use client";

import { AlertCircle, CheckCircle, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import type { AnalyzedOrderData, AnalyzedOrderLine } from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";

interface OrderAnalysisReviewProps {
  analysis: AnalyzedOrderData;
  companies: RubberCompanyDto[];
  products: RubberProductDto[];
  onUpdate: (updated: AnalyzedOrderData) => void;
}

export function OrderAnalysisReview({
  analysis,
  companies,
  products,
  onUpdate,
}: OrderAnalysisReviewProps) {
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editedLine, setEditedLine] = useState<AnalyzedOrderLine | null>(null);

  const handleCompanyChange = (companyId: number | null) => {
    const company = companyId ? companies.find((c) => c.id === companyId) : null;
    onUpdate({
      ...analysis,
      companyId: companyId,
      companyName: company?.name || null,
    });
  };

  const handlePoNumberChange = (poNumber: string) => {
    onUpdate({
      ...analysis,
      poNumber: poNumber || null,
    });
  };

  const handleStartEdit = (index: number) => {
    setEditingLineIndex(index);
    setEditedLine({ ...analysis.lines[index] });
  };

  const handleCancelEdit = () => {
    setEditingLineIndex(null);
    setEditedLine(null);
  };

  const handleSaveEdit = () => {
    if (editingLineIndex !== null && editedLine) {
      const newLines = [...analysis.lines];
      newLines[editingLineIndex] = editedLine;
      onUpdate({ ...analysis, lines: newLines });
      setEditingLineIndex(null);
      setEditedLine(null);
    }
  };

  const handleRemoveLine = (index: number) => {
    const newLines = analysis.lines.filter((_, i) => i !== index);
    onUpdate({ ...analysis, lines: newLines });
  };

  const handleProductChange = (productId: number | null) => {
    if (!editedLine) {
      return;
    }
    const product = productId ? products.find((p) => p.id === productId) : null;
    setEditedLine({
      ...editedLine,
      productId: productId,
      productName: product?.title || editedLine.productName,
    });
  };

  const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) {
      return "text-green-600";
    }
    if (confidence >= 0.5) {
      return "text-yellow-600";
    }
    return "text-red-600";
  };

  const confidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">{analysis.filename}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {analysis.fileType.toUpperCase()}
          </span>
          {analysis.extractionMethod === "template" ? (
            <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded inline-flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Template{analysis.templateName ? `: ${analysis.templateName}` : ""}
            </span>
          ) : (
            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded inline-flex items-center">
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              AI
            </span>
          )}
          <span className={`text-xs ${confidenceColor(analysis.confidence)}`}>
            {Math.round(analysis.confidence * 100)}% confidence
          </span>
        </div>
        {confidenceIcon(analysis.confidence)}
      </div>

      {analysis.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm font-medium text-red-800">Errors:</p>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {analysis.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Company</label>
          <select
            value={analysis.companyId || ""}
            onChange={(e) => handleCompanyChange(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
          >
            <option value="">Select a company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {analysis.companyName && !analysis.companyId && (
            <p className="mt-1 text-xs text-yellow-600">
              Detected: &quot;{analysis.companyName}&quot; - Please select matching company
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">PO Number</label>
          <input
            type="text"
            value={analysis.poNumber || ""}
            onChange={(e) => handlePoNumberChange(e.target.value)}
            placeholder="Enter PO number"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Order Lines ({analysis.lines.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Thickness (mm)
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Width (mm)
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Length (m)
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Conf
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.lines.map((line, index) => (
                <tr key={index}>
                  {editingLineIndex === index && editedLine ? (
                    <>
                      <td className="px-3 py-2 text-sm text-gray-500">{line.lineNumber}</td>
                      <td className="px-3 py-2">
                        <select
                          value={editedLine.productId || ""}
                          onChange={(e) =>
                            handleProductChange(e.target.value ? Number(e.target.value) : null)
                          }
                          className="w-full text-sm rounded border-gray-300 border p-1"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={editedLine.thickness ?? ""}
                          onChange={(e) =>
                            setEditedLine({
                              ...editedLine,
                              thickness: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-16 text-sm rounded border-gray-300 border p-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={editedLine.width ?? ""}
                          onChange={(e) =>
                            setEditedLine({
                              ...editedLine,
                              width: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-20 text-sm rounded border-gray-300 border p-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={editedLine.length ?? ""}
                          onChange={(e) =>
                            setEditedLine({
                              ...editedLine,
                              length: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-16 text-sm rounded border-gray-300 border p-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={editedLine.quantity ?? ""}
                          onChange={(e) =>
                            setEditedLine({
                              ...editedLine,
                              quantity: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="w-14 text-sm rounded border-gray-300 border p-1"
                        />
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">
                        <div className="flex space-x-1">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-sm text-gray-500">{line.lineNumber}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {line.productId ? (
                          <span className="text-green-700">{line.productName}</span>
                        ) : (
                          <span className="text-yellow-600">{line.productName || "Unknown"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{line.thickness ?? "-"}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{line.width ?? "-"}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{line.length ?? "-"}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{line.quantity ?? "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs ${confidenceColor(line.confidence)}`}>
                          {Math.round(line.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleStartEdit(index)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveLine(index)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {analysis.lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-sm text-gray-500">
                    No order lines detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
