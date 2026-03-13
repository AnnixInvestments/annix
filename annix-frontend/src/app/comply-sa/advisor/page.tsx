"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useAddAdvisorClient,
  useAdvisorDashboard,
  useRemoveAdvisorClient,
} from "@/app/lib/query/hooks";

type DashboardData = NonNullable<ReturnType<typeof useAdvisorDashboard>["data"]>;
type Client = DashboardData["clients"][number];
type SortKey = "score_asc" | "score_desc" | "name" | "overdue";

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function sortClients(clients: Client[], sortKey: SortKey): Client[] {
  return [...clients].sort((a, b) => {
    if (sortKey === "score_asc") return a.complianceScore - b.complianceScore;
    if (sortKey === "score_desc") return b.complianceScore - a.complianceScore;
    if (sortKey === "name") return a.companyName.localeCompare(b.companyName);
    return b.overdueCount - a.overdueCount;
  });
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color} opacity-50`} />
      </div>
    </div>
  );
}

function ClientCard({
  client,
  onRemove,
}: {
  client: Client;
  onRemove: (companyId: number) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{client.companyName}</h3>
          {client.lastActivity && (
            <p className="text-xs text-slate-500 mt-1">
              Last activity: {formatDateZA(client.lastActivity)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {client.overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400">
              {client.overdueCount} overdue
            </span>
          )}
          {client.warningCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              {client.warningCount} warning
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">Compliance Score</span>
          <span className={`text-sm font-bold ${scoreTextColor(client.complianceScore)}`}>
            {client.complianceScore}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreColor(client.complianceScore)}`}
            style={{ width: `${client.complianceScore}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <Link
          href={`/dashboard?companyId=${client.companyId}`}
          className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View Details
        </Link>
        {confirmRemove ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Remove?</span>
            <button
              type="button"
              onClick={() => onRemove(client.companyId)}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="text-xs text-slate-400 hover:text-white font-medium"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Remove client"
            onClick={() => setConfirmRemove(true)}
            className="text-slate-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addClient = useAddAdvisorClient();
  const { showToast } = useToast();

  if (!open) return null;

  function handleAdd() {
    const id = Number(companyId);
    if (!id || id <= 0) {
      setError("Please enter a valid company ID");
      return;
    }
    setError(null);
    addClient.mutate(id, {
      onSuccess: () => {
        setCompanyId("");
        showToast("Client added successfully", "success");
        onClose();
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Failed to add client";
        setError(message);
        showToast(message, "error");
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Add Client</h2>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company ID</label>
          <input
            type="number"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Enter company ID"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={addClient.isPending}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {addClient.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Client
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 bg-slate-700 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-48 bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  const { data, isLoading, error } = useAdvisorDashboard();
  const removeClient = useRemoveAdvisorClient();
  const { showToast } = useToast();
  const [sortKey, setSortKey] = useState<SortKey>("score_desc");
  const [modalOpen, setModalOpen] = useState(false);

  function handleRemoveClient(companyId: number) {
    removeClient.mutate(companyId, {
      onSuccess: () => showToast("Client removed successfully", "success"),
      onError: () => showToast("Failed to remove client", "error"),
    });
  }

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
        {error.message}
      </div>
    );
  }

  if (!data) return null;

  const sortedClients = sortClients(data.clients, sortKey);

  const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: "score_desc", label: "Score (High to Low)" },
    { key: "score_asc", label: "Score (Low to High)" },
    { key: "name", label: "Company Name" },
    { key: "overdue", label: "Most Overdue" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-teal-400" />
            Advisor Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Manage and monitor client compliance</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={data.totalClients}
          color="text-teal-400"
          icon={Users}
        />
        <StatCard
          label="Total Overdue"
          value={data.totalOverdue}
          color="text-red-400"
          icon={AlertCircle}
        />
        <StatCard
          label="Total Warnings"
          value={data.totalWarnings}
          color="text-yellow-400"
          icon={AlertTriangle}
        />
        <StatCard
          label="Avg. Score"
          value={`${data.averageScore}%`}
          color="text-green-400"
          icon={TrendingUp}
        />
      </div>

      <div className="flex items-center gap-3">
        <ArrowUpDown className="h-4 w-4 text-slate-400" />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {sortedClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedClients.map((client) => (
            <ClientCard key={client.companyId} client={client} onRemove={handleRemoveClient} />
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No clients added yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Click "Add Client" to start managing company compliance
          </p>
        </div>
      )}

      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
