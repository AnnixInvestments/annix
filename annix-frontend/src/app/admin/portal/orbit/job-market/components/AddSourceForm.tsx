"use client";

import { useMemo, useState } from "react";
import type {
  CreateJobMarketSourceDto,
  JobSourceProvider,
  JobSourceProviderInfo,
} from "@/app/lib/api/annixOrbitApi";

const inputClasses =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export function AddSourceForm({
  providers,
  isLoading,
  isError,
  onSubmit,
  onCancel,
}: {
  providers: JobSourceProviderInfo[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onSubmit: (dto: CreateJobMarketSourceDto) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<JobSourceProvider | "">("");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [countryCodes, setCountryCodes] = useState("za");
  const [intervalHours, setIntervalHours] = useState("6");

  const selectedProvider = useMemo<JobSourceProviderInfo | null>(() => {
    if (!providers || !provider) return null;
    const match = providers.find((entry) => entry.id === provider);
    return match ?? null;
  }, [providers, provider]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as JobSourceProvider | "";
    setProvider(next);
    setCredentials({});
    if (!nameEdited && providers) {
      const match = providers.find((entry) => entry.id === next);
      const defaultName = match ? match.label : "";
      setName(defaultName);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameEdited(true);
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    const fields = selectedProvider.credentialFields;
    const wantsApiId = fields.some((field) => field.key === "apiId");
    const wantsApiKey = fields.some((field) => field.key === "apiKey");

    const rawApiId = credentials.apiId;
    const rawApiKey = credentials.apiKey;
    const trimmedApiId = rawApiId ? rawApiId.trim() : "";
    const trimmedApiKey = rawApiKey ? rawApiKey.trim() : "";

    const submitApiId = wantsApiId ? trimmedApiId || null : null;
    const submitApiKey = wantsApiKey ? trimmedApiKey || null : null;

    onSubmit({
      provider: selectedProvider.id,
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

  const hasProviders = Boolean(providers && providers.length > 0);
  const credentialFields = selectedProvider ? selectedProvider.credentialFields : [];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-gray-900">Add Job Source</h3>

      {isLoading && <p className="text-sm text-gray-500">Loading providers…</p>}

      {isError && (
        <p className="text-sm text-red-600">Could not load job providers — please try again.</p>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                required
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={provider}
                onChange={handleProviderChange}
                required
                className={inputClasses}
              >
                <option value="" disabled>
                  Select a provider…
                </option>
                {(providers ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProvider && (
            <p className="text-sm text-gray-500">{selectedProvider.description}</p>
          )}

          {credentialFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {credentialFields.map((field) => {
                const fieldType = field.secret ? "password" : "text";
                const rawFieldValue = credentials[field.key];
                const fieldValue = rawFieldValue || "";
                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={fieldType}
                      value={fieldValue}
                      onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                      required
                      className={inputClasses}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {selectedProvider && credentialFields.length === 0 && (
            <p className="text-sm text-gray-500">
              {selectedProvider.label} is a public API — no API key needed.
            </p>
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
                className={inputClasses}
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
                className={inputClasses}
              />
            </div>
          </div>
        </>
      )}

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
          disabled={isLoading || isError || !hasProviders || !selectedProvider}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Source
        </button>
      </div>
    </form>
  );
}
