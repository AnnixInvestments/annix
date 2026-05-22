"use client";

import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import type {
  AddWatchlistItemPayload,
  InsightsAssetType,
  InsightsCurrency,
  InsightsExchange,
} from "@/app/lib/api/insightsApi";

const EXCHANGES: InsightsExchange[] = [
  "JSE",
  "NYSE",
  "NASDAQ",
  "LSE",
  "TSX",
  "HKEX",
  "TSE",
  "SSE",
  "ASX",
  "COMMODITY",
  "INDEX",
  "FOREX",
];

const ASSET_TYPES: { value: InsightsAssetType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "leveraged_etf", label: "Leveraged ETF" },
  { value: "commodity", label: "Commodity" },
  { value: "index", label: "Index" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
];

const CURRENCIES: InsightsCurrency[] = [
  "ZAR",
  "USD",
  "GBP",
  "EUR",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "HKD",
];

interface AddWatchlistModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: AddWatchlistItemPayload) => void;
}

export function AddWatchlistModal(props: AddWatchlistModalProps) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [exchange, setExchange] = useState<InsightsExchange>("NYSE");
  const [currency, setCurrency] = useState<InsightsCurrency>("USD");
  const [assetType, setAssetType] = useState<InsightsAssetType>("stock");
  const [sector, setSector] = useState("");
  const [notes, setNotes] = useState("");
  const [targetReason, setTargetReason] = useState("");

  const reset = () => {
    setSymbol("");
    setName("");
    setExchange("NYSE");
    setCurrency("USD");
    setAssetType("stock");
    setSector("");
    setNotes("");
    setTargetReason("");
  };

  const handleSubmit = () => {
    const payload: AddWatchlistItemPayload = {
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      exchange,
      currency,
      assetType,
    };
    const trimmedSector = sector.trim();
    if (trimmedSector.length > 0) payload.sector = trimmedSector;
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > 0) payload.notes = trimmedNotes;
    const trimmedReason = targetReason.trim();
    if (trimmedReason.length > 0) payload.targetReason = trimmedReason;
    props.onSubmit(payload);
  };

  const handleClose = () => {
    reset();
    props.onClose();
  };

  const trimmedSymbol = symbol.trim();
  const trimmedName = name.trim();
  const submitDisabled = trimmedSymbol.length === 0 || trimmedName.length === 0;

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title="Add symbol to watchlist"
      submitLabel="Add to watchlist"
      loading={props.isSubmitting}
      submitDisabled={submitDisabled}
      error={props.error}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ins-add-symbol"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Yahoo symbol
            </label>
            <input
              id="ins-add-symbol"
              type="text"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="AGL.JO, SPY, ^J200"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent uppercase"
            />
          </div>
          <div>
            <label htmlFor="ins-add-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              id="ins-add-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anglo American"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="ins-add-exchange"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Exchange
            </label>
            <select
              id="ins-add-exchange"
              value={exchange}
              onChange={(e) => setExchange(e.target.value as InsightsExchange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent bg-white"
            >
              {EXCHANGES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="ins-add-currency"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Currency
            </label>
            <select
              id="ins-add-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as InsightsCurrency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="ins-add-asset-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Asset type
            </label>
            <select
              id="ins-add-asset-type"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as InsightsAssetType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent bg-white"
            >
              {ASSET_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ins-add-sector" className="block text-sm font-medium text-gray-700 mb-1">
            Sector <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="ins-add-sector"
            type="text"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Diversified mining"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="ins-add-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Why this asset? <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="ins-add-reason"
            rows={2}
            value={targetReason}
            onChange={(e) => setTargetReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="ins-add-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="ins-add-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent"
          />
        </div>
      </div>
    </FormModal>
  );
}
