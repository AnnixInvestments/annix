"use client";

import { BookOpen, DollarSign, Info, Loader2, Plug, Receipt, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { integrationsList } from "@/app/comply-sa/lib/api";

type Integration = Awaited<ReturnType<typeof integrationsList>>[number];

const INTEGRATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sage: DollarSign,
  xero: BookOpen,
  quickbooks: Receipt,
  simplepay: Users,
};

const INTEGRATION_COLORS: Record<string, string> = {
  sage: "bg-green-500/10 text-green-400",
  xero: "bg-blue-500/10 text-blue-400",
  quickbooks: "bg-emerald-500/10 text-emerald-400",
  simplepay: "bg-purple-500/10 text-purple-400",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  connected: {
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
    label: "Connected",
  },
  available: {
    bg: "bg-teal-500/10 border-teal-500/30",
    text: "text-teal-400",
    label: "Available",
  },
  coming_soon: {
    bg: "bg-slate-500/10 border-slate-500/30",
    text: "text-slate-400",
    label: "Coming Soon",
  },
};

const FALLBACK_INTEGRATIONS: Integration[] = [
  {
    id: "sage",
    name: "Sage",
    description:
      "Sync financial data from Sage Business Cloud for automated tax compliance checking.",
    status: "coming_soon",
    category: "accounting",
  },
  {
    id: "xero",
    name: "Xero",
    description:
      "Connect your Xero account to automatically import financial records and VAT data.",
    status: "coming_soon",
    category: "accounting",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Import payroll and financial data from QuickBooks for SDL and UIF calculations.",
    status: "coming_soon",
    category: "accounting",
  },
  {
    id: "simplepay",
    name: "SimplePay",
    description:
      "Sync payroll data from SimplePay for automated labour compliance and UIF tracking.",
    status: "coming_soon",
    category: "payroll",
  },
];

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = INTEGRATION_ICONS[integration.id] ?? Plug;
  const iconColor = INTEGRATION_COLORS[integration.id] ?? "bg-slate-500/10 text-slate-400";
  const statusStyle = STATUS_STYLES[integration.status] ?? STATUS_STYLES.coming_soon;
  const isComingSoon = integration.status === "coming_soon";

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-white mb-1">{integration.name}</h3>
      <p className="text-xs text-slate-400 flex-1">{integration.description}</p>

      <button
        type="button"
        disabled={isComingSoon}
        className={`mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isComingSoon
            ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            : "bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
        }`}
      >
        {integration.status === "connected" ? "Manage" : "Connect"}
      </button>
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await integrationsList();
      setIntegrations(data);
    } catch {
      setIntegrations(FALLBACK_INTEGRATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Plug className="h-7 w-7 text-teal-400" />
          Integrations
        </h1>
        <p className="text-slate-400 mt-1">
          Connect your business tools for automated compliance checking
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-2">
        <Info className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-300">
          Integrations sync your business data for automated compliance checking. Connect your
          accounting or payroll software to streamline your compliance workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}
