"use client";

import { useState } from "react";
import type { CreateJobMarketSourceDto } from "@/app/lib/api/cvAssistantApi";

export function AddSourceForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (dto: CreateJobMarketSourceDto) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("Adzuna SA");
  const [apiId, setApiId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [countryCodes, setCountryCodes] = useState("za");
  const [intervalHours, setIntervalHours] = useState("6");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      provider: "adzuna",
      name,
      apiId: apiId || undefined,
      apiKey: apiKey || undefined,
      countryCodes: countryCodes
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
      ingestionIntervalHours: Number.parseInt(intervalHours, 10) || 6,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-gray-900">Add Job Source</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <input
            type="text"
            value="Adzuna"
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adzuna App ID</label>
          <input
            type="text"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            placeholder="Your Adzuna app_id"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adzuna App Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your Adzuna app_key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country Codes (comma-separated)
          </label>
          <input
            type="text"
            value={countryCodes}
            onChange={(e) => setCountryCodes(e.target.value)}
            placeholder="za, gb, us"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingestion Interval (hours)
          </label>
          <input
            type="number"
            value={intervalHours}
            onChange={(e) => setIntervalHours(e.target.value)}
            min="1"
            max="24"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Add Source
        </button>
      </div>
    </form>
  );
}
