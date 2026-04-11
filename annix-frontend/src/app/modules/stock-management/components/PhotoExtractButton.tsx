"use client";

import { useRef, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

export interface PhotoExtractedFields {
  kind: "paint" | "consumable" | "rubber_roll" | "other";
  productName: string | null;
  sku: string | null;
  batchNumber: string | null;
  rollNumber: string | null;
  weightKg: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  compoundCode: string | null;
  colour: string | null;
  confidence: number;
  reasoning: string;
  matches: Array<{
    productId: number;
    sku: string;
    name: string;
    productType: string;
    similarity: number;
  }>;
}

interface PhotoExtractButtonProps {
  onExtracted: (fields: PhotoExtractedFields) => void;
  label?: string;
}

export function PhotoExtractButton(props: PhotoExtractButtonProps) {
  const config = useStockManagementConfig();
  const onExtractedProp = props.onExtracted;
  const labelProp = props.label;
  const labelText = labelProp == null ? "Take photo to auto-fill" : labelProp;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setIsExtracting(true);
    setError(null);
    setLastReasoning(null);
    try {
      const client = new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      });
      const result = await client.identifyPhoto(file);
      onExtractedProp({
        kind: result.kind,
        productName: result.extracted.productName,
        sku: result.extracted.sku,
        batchNumber: result.extracted.batchNumber,
        rollNumber: result.extracted.rollNumber,
        weightKg: result.extracted.weightKg,
        widthMm: result.extracted.widthMm,
        thicknessMm: result.extracted.thicknessMm,
        lengthM: result.extracted.lengthM,
        compoundCode: result.extracted.compoundCode,
        colour: result.extracted.colour,
        confidence: result.confidence,
        reasoning: result.reasoning,
        matches: result.matches,
      });
      setLastReasoning(`${result.reasoning} (${Math.round(result.confidence * 100)}% confidence)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsExtracting(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isExtracting}
        className="inline-flex items-center gap-2 rounded border border-teal-600 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {isExtracting ? "Analysing photo…" : labelText}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      {lastReasoning != null ? (
        <div className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
          AI: {lastReasoning}
        </div>
      ) : null}
      {error != null ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          Photo extraction failed: {error}
        </div>
      ) : null}
    </div>
  );
}
