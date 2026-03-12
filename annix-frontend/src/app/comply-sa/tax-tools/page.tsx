"use client";

import { AlertTriangle, Calculator, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  useMinimumWageCheck,
  useSdlAssessment,
  useTurnoverTaxEstimate,
  useUifCalculation,
  useVatAssessment,
} from "@/app/lib/query/hooks";

type Tab = "wage" | "vat" | "turnover" | "uif" | "sdl";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "wage", label: "Minimum Wage" },
  { key: "vat", label: "VAT Assessment" },
  { key: "turnover", label: "Turnover Tax" },
  { key: "uif", label: "UIF Calculator" },
  { key: "sdl", label: "SDL Assessment" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function ComplianceBadge({
  compliant,
  labels,
}: {
  compliant: boolean;
  labels?: { yes: string; no: string };
}) {
  const yesLabel = labels?.yes ?? "Compliant";
  const noLabel = labels?.no ?? "Non-Compliant";

  return compliant ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400">
      <CheckCircle className="h-4 w-4" />
      {yesLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400">
      <XCircle className="h-4 w-4" />
      {noLabel}
    </span>
  );
}

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-teal-400" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function MinimumWageTab() {
  const [hourlyRate, setHourlyRate] = useState("");
  const mutation = useMinimumWageCheck();

  function handleSubmit() {
    const rate = Number(hourlyRate);
    if (!rate || rate <= 0) return;
    mutation.mutate(rate);
  }

  const result = mutation.data ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Hourly Rate (ZAR)</label>
        <div className="flex gap-3">
          <input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="e.g. 28.50"
            step="0.01"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <ComplianceBadge compliant={result.compliant} />
          <div className="divide-y divide-slate-700/50">
            <ResultRow
              label="Current Minimum Wage"
              value={`R${result.currentMinimum.toFixed(2)}/hr`}
            />
            <ResultRow
              label="Shortfall"
              value={result.shortfall > 0 ? formatCurrency(result.shortfall) : "None"}
              highlight={result.shortfall === 0}
            />
            <ResultRow
              label="Calculated Overtime Rate"
              value={`R${result.overtimeRate.toFixed(2)}/hr`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VatTab() {
  const [turnover, setTurnover] = useState("");
  const mutation = useVatAssessment();

  function handleSubmit() {
    const amount = Number(turnover.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) return;
    mutation.mutate(amount);
  }

  const result = mutation.data ?? null;

  const statusBadge = (status: string) => {
    const config: Record<
      string,
      { color: string; icon: React.ComponentType<{ className?: string }>; label: string }
    > = {
      must_register: {
        color: "bg-red-500/10 border-red-500/30 text-red-400",
        icon: AlertTriangle,
        label: "Must Register",
      },
      voluntary: {
        color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        icon: AlertTriangle,
        label: "Can Voluntarily Register",
      },
      not_required: {
        color: "bg-green-500/10 border-green-500/30 text-green-400",
        icon: CheckCircle,
        label: "Not Required",
      },
    };
    const c = config[status] ?? config["not_required"]!;
    const Icon = c.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${c.color}`}
      >
        <Icon className="h-4 w-4" />
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Annual Turnover (ZAR)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={turnover}
            onChange={(e) => setTurnover(e.target.value)}
            placeholder="e.g. 1200000"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assess"}
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
          {statusBadge(result.status)}
          <div className="divide-y divide-slate-700/50">
            <ResultRow label="Mandatory Threshold" value={formatCurrency(result.threshold)} />
            <ResultRow
              label="Voluntary Threshold"
              value={formatCurrency(result.voluntaryThreshold)}
            />
          </div>
          <p className="text-sm text-slate-400">{result.description}</p>
        </div>
      )}
    </div>
  );
}

function TurnoverTaxTab() {
  const [turnover, setTurnover] = useState("");
  const mutation = useTurnoverTaxEstimate();

  function handleSubmit() {
    const amount = Number(turnover.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) return;
    mutation.mutate(amount);
  }

  const result = mutation.data ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Annual Turnover (ZAR)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={turnover}
            onChange={(e) => setTurnover(e.target.value)}
            placeholder="e.g. 800000"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Estimate"}
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <ComplianceBadge
            compliant={result.eligible}
            labels={{ yes: "Eligible", no: "Not Eligible" }}
          />
          <div className="divide-y divide-slate-700/50">
            <ResultRow
              label="Estimated Turnover Tax"
              value={formatCurrency(result.estimatedTax)}
              highlight
            />
            <ResultRow label="Effective Rate" value={`${result.effectiveRate.toFixed(2)}%`} />
            <ResultRow
              label="Corporate Tax Comparison"
              value={formatCurrency(result.corporateTaxComparison)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UifTab() {
  const [remuneration, setRemuneration] = useState("");
  const mutation = useUifCalculation();

  function handleSubmit() {
    const amount = Number(remuneration.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) return;
    mutation.mutate(amount);
  }

  const result = mutation.data ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Monthly Remuneration (ZAR)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={remuneration}
            onChange={(e) => setRemuneration(e.target.value)}
            placeholder="e.g. 25000"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculate"}
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
          {result.capped && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Capped at ceiling
            </span>
          )}
          <div className="divide-y divide-slate-700/50">
            <ResultRow
              label="Employee Contribution"
              value={formatCurrency(result.employeeContribution)}
            />
            <ResultRow
              label="Employer Contribution"
              value={formatCurrency(result.employerContribution)}
            />
            <ResultRow
              label="Total Monthly"
              value={formatCurrency(result.totalContribution)}
              highlight
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SdlTab() {
  const [payroll, setPayroll] = useState("");
  const mutation = useSdlAssessment();

  function handleSubmit() {
    const amount = Number(payroll.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) return;
    mutation.mutate(amount);
  }

  const result = mutation.data ?? null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Annual Payroll (ZAR)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={payroll}
            onChange={(e) => setPayroll(e.target.value)}
            placeholder="e.g. 600000"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assess"}
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <ComplianceBadge
            compliant={!result.applicable}
            labels={{ yes: "Not Applicable", no: "Applicable" }}
          />
          <div className="divide-y divide-slate-700/50">
            <ResultRow
              label="Annual SDL Amount"
              value={formatCurrency(result.annualAmount)}
              highlight
            />
            <ResultRow label="Threshold" value={formatCurrency(result.threshold)} />
          </div>
          <p className="text-sm text-slate-400">{result.description}</p>
        </div>
      )}
    </div>
  );
}

const TAB_COMPONENTS: Record<Tab, React.FC> = {
  wage: MinimumWageTab,
  vat: VatTab,
  turnover: TurnoverTaxTab,
  uif: UifTab,
  sdl: SdlTab,
};

export default function TaxToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("wage");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calculator className="h-7 w-7 text-teal-400" />
          Tax Tools
        </h1>
        <p className="text-slate-400 mt-1">South African tax calculators and compliance checkers</p>
      </div>

      <div className="border-b border-slate-700">
        <div className="flex overflow-x-auto -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
