"use client";

import { useState } from "react";
import type { InvoiceClarification, StockItem } from "@/app/lib/api/stockControlApi";

interface InvoiceClarificationPopupProps {
  clarification: InvoiceClarification;
  totalClarifications: number;
  currentIndex: number;
  stockItems: StockItem[];
  onSubmit: (
    clarificationId: number,
    response: {
      selectedStockItemId?: number;
      createNewItem?: {
        sku: string;
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
      };
      skipPriceUpdate?: boolean;
      confirmed?: boolean;
    },
  ) => void;
  onSkip: (clarificationId: number) => void;
  onClose: () => void;
}

export default function InvoiceClarificationPopup({
  clarification,
  totalClarifications,
  currentIndex,
  stockItems,
  onSubmit,
  onSkip,
}: InvoiceClarificationPopupProps) {
  const [selectedStockItemId, setSelectedStockItemId] = useState<number | null>(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unitOfMeasure: "each",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedMatches = clarification.context?.suggestedMatches || [];
  const isPriceConfirmation = clarification.clarificationType === "price_confirmation";

  const filteredStockItems = stockItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectMatch = async (stockItemId: number) => {
    setIsSubmitting(true);
    await onSubmit(clarification.id, { selectedStockItemId: stockItemId });
    setIsSubmitting(false);
  };

  const handleConfirmPrice = async () => {
    setIsSubmitting(true);
    await onSubmit(clarification.id, { confirmed: true });
    setIsSubmitting(false);
  };

  const handleSkipPrice = async () => {
    setIsSubmitting(true);
    await onSubmit(clarification.id, { skipPriceUpdate: true });
    setIsSubmitting(false);
  };

  const handleCreateNewItem = async () => {
    if (!newItemForm.sku || !newItemForm.name) return;
    setIsSubmitting(true);
    await onSubmit(clarification.id, { createNewItem: newItemForm });
    setIsSubmitting(false);
    setShowNewItemForm(false);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await onSkip(clarification.id);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-x-0 top-16 bottom-16 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300 max-h-full flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 bg-teal-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                {isPriceConfirmation ? "Confirm Price Change" : "Match Required"}
              </h3>
              <p className="text-white/70 text-xs">
                Question {currentIndex + 1} of {totalClarifications}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-gray-800 text-sm mb-4">{clarification.question}</p>

          {clarification.context?.extractedDescription && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-800 text-sm font-mono">
                {clarification.context.extractedDescription}
              </p>
              {clarification.context.extractedSku && (
                <p className="text-gray-500 text-xs mt-1">
                  SKU: {clarification.context.extractedSku}
                </p>
              )}
            </div>
          )}

          {isPriceConfirmation && clarification.context && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Price</p>
                  <p className="text-lg font-semibold text-gray-900">
                    R{clarification.context.oldPrice?.toFixed(2)}
                  </p>
                </div>
                <svg
                  className="w-6 h-6 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <div className="text-right">
                  <p className="text-sm text-gray-600">New Price</p>
                  <p className="text-lg font-semibold text-gray-900">
                    R{clarification.context.newPrice?.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    (clarification.context.priceChangePercent || 0) > 0
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {(clarification.context.priceChangePercent || 0) > 0 ? "+" : ""}
                  {clarification.context.priceChangePercent?.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {!isPriceConfirmation && !showNewItemForm && (
            <>
              {suggestedMatches.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Matches</h4>
                  <div className="space-y-2">
                    {suggestedMatches.map((match) => (
                      <button
                        key={match.stockItemId}
                        onClick={() => handleSelectMatch(match.stockItemId)}
                        disabled={isSubmitting}
                        className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {match.stockItemName}
                            </p>
                            <p className="text-xs text-gray-500">{match.stockItemSku}</p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                match.confidence >= 80
                                  ? "bg-green-100 text-green-800"
                                  : match.confidence >= 50
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {Math.round(match.confidence)}% match
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              R{match.currentPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Search Stock Items</h4>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or SKU..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
                {searchQuery && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredStockItems.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectMatch(item.id)}
                        disabled={isSubmitting}
                        className="w-full p-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50"
                      >
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </button>
                    ))}
                    {filteredStockItems.length === 0 && (
                      <p className="p-3 text-sm text-gray-500 text-center">No items found</p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowNewItemForm(true)}
                className="w-full p-3 text-center border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
              >
                + Create New Stock Item
              </button>
            </>
          )}

          {showNewItemForm && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Create New Stock Item</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SKU *</label>
                  <input
                    type="text"
                    value={newItemForm.sku}
                    onChange={(e) => setNewItemForm({ ...newItemForm, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <input
                    type="text"
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                  <select
                    value={newItemForm.unitOfMeasure}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, unitOfMeasure: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="each">Each</option>
                    <option value="liters">Liters</option>
                    <option value="kg">Kilograms</option>
                    <option value="m">Meters</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewItemForm(false)}
                  className="flex-1 py-2 px-3 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateNewItem}
                  disabled={isSubmitting || !newItemForm.sku || !newItemForm.name}
                  className="flex-1 py-2 px-3 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? "Creating..." : "Create & Match"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-white">
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 py-2 px-3 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
            >
              Skip
            </button>
            {isPriceConfirmation && (
              <>
                <button
                  onClick={handleSkipPrice}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-lg font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 transition-colors disabled:opacity-50 text-sm"
                >
                  Keep Old Price
                </button>
                <button
                  onClick={handleConfirmPrice}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? "Confirming..." : "Apply New Price"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="h-1 flex-shrink-0 bg-teal-600" />
      </div>
    </div>
  );
}
