"use client";

import { useState } from "react";
import type { CreateJobMarketSourceDto, JobSourceProvider } from "@/app/lib/api/cvAssistantApi";

const PROVIDER_OPTIONS: { value: JobSourceProvider; label: string }[] = [
  { value: "adzuna", label: "Adzuna" },
  { value: "jooble", label: "Jooble" },
  { value: "remotive", label: "Remotive" },
];

const PROVIDER_DEFAULT_NAMES: Record<JobSourceProvider, string> = {
  adzuna: "Adzuna SA",
  jooble: "Jooble SA",
  remotive: "Remotive Remote Jobs",
};

export function AddSourceForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (dto: CreateJobMarketSourceDto) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<JobSourceProvider>("adzuna");
  const [name, setName] = useState(PROVIDER_DEFAULT_NAMES.adzuna);
  const [nameEdited, setNameEdited] = useState(false);
  const [apiId, setApiId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [countryCodes, setCountryCodes] = useState("za");
  const [intervalHours, setIntervalHours] = useState("6");

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as JobSourceProvider;
    setProvider(next);
    if (!nameEdited) {
      const defaultName = PROVIDER_DEFAULT_NAMES[next];
      setName(defaultName);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameEdited(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = apiId.trim();
    const trimmedKey = apiKey.trim();
    const submitApiId = provider === "adzuna" ? trimmedId || null : null;
    const submitApiKey = provider === "remotive" ? null : trimmedKey || null;
    onSubmit({
      provider,
      name,
      apiId: submitApiId,
      apiKey: submitApiKey,
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
      className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-gray-900">Add Job Source</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            value={provider}
            onChange={handleProviderChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {provider === "adzuna" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adzuna App ID</label>
            <input
              type="text"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              required
              placeholder="Your Adzuna app_id"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adzuna App Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              placeholder="Your Adzuna app_key"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {provider === "jooble" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jooble API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder="Your Jooble API key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
          />
        </div>
      )}

      {provider === "remotive" && (
        <p className="text-sm text-gray-500">Remotive is a public API — no API key needed.</p>
      )}

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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
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
          className="px-4 py-2 text-sm bg-[#323288] text-white rounded-lg hover:bg-[#252560]"
        >
          Add Source
        </button>
      </div>
    </form>
  );
}
