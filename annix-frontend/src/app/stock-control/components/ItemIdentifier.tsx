"use client";

import { useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { PhotoCapture } from "./PhotoCapture";

interface IdentifiedItem {
  name: string;
  category: string;
  description: string;
  confidence: number;
  suggestedSku: string;
}

interface MatchingStockItem {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  similarity: number;
}

interface IdentifyResponse {
  identifiedItems: IdentifiedItem[];
  matchingStockItems: MatchingStockItem[];
  rawAnalysis: string;
}

interface ItemIdentifierProps {
  onSelectExisting?: (item: MatchingStockItem) => void;
  onCreateNew?: (item: IdentifiedItem) => void;
}

export function ItemIdentifier({ onSelectExisting, onCreateNew }: ItemIdentifierProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleCapture = async (file: File, previewUrl?: string) => {
    setError(null);
    setResult(null);
    setPhotoPreview(previewUrl ?? null);
    setIsAnalyzing(true);

    try {
      const response = await stockControlApiClient.identifyFromPhoto(file);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to identify item";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPhotoPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          AI Item Identification
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Take a photo of an item to identify it using AI. The system will analyze the image and
          suggest matching items from your inventory.
        </p>

        {!result && !isAnalyzing && (
          <PhotoCapture onCapture={handleCapture} enableCamera={true} compressOnCapture={true} />
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Analyzing image...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg">
            <p className="font-medium">Analysis failed</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={handleReset}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {result && (
        <>
          {photoPreview && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-start gap-4">
                <img
                  src={photoPreview}
                  alt="Captured"
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{result.rawAnalysis}</p>
                  <button
                    onClick={handleReset}
                    className="mt-2 text-sm font-medium text-teal-600 hover:underline"
                  >
                    Take another photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {result.identifiedItems.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Identified Items
              </h3>
              <div className="space-y-3">
                {result.identifiedItems.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-slate-600 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.category}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Suggested SKU: {item.suggestedSku}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.confidence >= 0.8
                              ? "bg-green-100 text-green-700"
                              : item.confidence >= 0.5
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                        {onCreateNew && (
                          <button
                            onClick={() => onCreateNew(item)}
                            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
                          >
                            Create Item
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.matchingStockItems.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Matching Inventory Items
              </h3>
              <div className="space-y-2">
                {result.matchingStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        SKU: {item.sku}
                        {item.category && ` | ${item.category}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {Math.round(item.similarity * 100)}% match
                      </span>
                      {onSelectExisting && (
                        <button
                          onClick={() => onSelectExisting(item)}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.identifiedItems.length === 0 && result.matchingStockItems.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-4 rounded-lg">
              <p className="font-medium">No items identified</p>
              <p className="text-sm mt-1">
                The AI could not identify any items in the photo. Try taking a clearer photo or
                capturing the item from a different angle.
              </p>
              <button
                onClick={handleReset}
                className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
