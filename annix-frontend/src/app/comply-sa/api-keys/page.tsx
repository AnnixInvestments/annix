"use client";

import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Info,
  Key,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateZA } from "@/app/lib/datetime";
import type { ApiKeyItem } from "@/app/lib/query/hooks";
import { useApiKeysList, useGenerateApiKey, useRevokeApiKey } from "@/app/lib/query/hooks";

function GenerateModal({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const generateMutation = useGenerateApiKey();

  const isGenerating = generateMutation.isPending;
  const nameTrimmed = name.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameTrimmed) return;
    generateMutation.mutate(nameTrimmed, {
      onSuccess: (result) => onGenerated(result.key),
      onError: () => onClose(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Generate API Key</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Key Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production API"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating || !nameTrimmed}
            className="w-full px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Key"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function KeyRevealModal({ apiKey, onClose }: { apiKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Your API Key</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-400">
            This key will only be shown once. Copy it now and store it securely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-teal-400 font-mono break-all">
            {apiKey}
          </code>
          <button
            type="button"
            aria-label="Copy API key"
            onClick={handleCopy}
            className="shrink-0 p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-slate-300" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKeyItem; onRevoke: (id: number) => void }) {
  return (
    <tr className="border-b border-slate-700 last:border-b-0">
      <td className="px-4 py-3 text-sm text-white font-medium">{apiKey.name}</td>
      <td className="px-4 py-3 text-sm text-slate-400 font-mono">{apiKey.keyPreview}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{formatDateZA(apiKey.createdAt)}</td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {apiKey.lastUsedAt ? formatDateZA(apiKey.lastUsedAt) : "Never"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            apiKey.status === "active"
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {apiKey.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {apiKey.status === "active" && (
          <button
            type="button"
            aria-label="Revoke API key"
            onClick={() => onRevoke(apiKey.id)}
            className="text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function ApiKeysPage() {
  const { data: keys = [], isLoading, error } = useApiKeysList();
  const revokeMutation = useRevokeApiKey();
  const { showToast } = useToast();
  const [showGenerate, setShowGenerate] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  function handleGenerated(key: string) {
    setShowGenerate(false);
    setRevealedKey(key);
    showToast("API key generated successfully", "success");
  }

  function handleRevoke(id: number) {
    setRevokeError(null);
    revokeMutation.mutate(id, {
      onSuccess: () => showToast("API key revoked", "success"),
      onError: () => {
        setRevokeError("Failed to revoke API key");
        showToast("Failed to revoke API key", "error");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  const errorMsg = error?.message;
  const displayError = errorMsg || revokeError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Key className="h-7 w-7 text-teal-400" />
            API Keys
          </h1>
          <p className="text-slate-400 mt-1">Manage programmatic access to your compliance data</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Generate New Key
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-2">
        <Info className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-300">
          API keys allow programmatic access to your compliance data. Enterprise plan required.
        </p>
      </div>

      {displayError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {displayError}
        </div>
      )}

      {(keys as ApiKeyItem[]).length > 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(keys as ApiKeyItem[]).map((key) => (
                  <KeyRow key={key.id} apiKey={key} onRevoke={handleRevoke} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Key className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No API keys generated yet</p>
        </div>
      )}

      {showGenerate && (
        <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={handleGenerated} />
      )}

      {revealedKey && <KeyRevealModal apiKey={revealedKey} onClose={() => setRevealedKey(null)} />}
    </div>
  );
}
