"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useComplySaDashboard,
  useToggleChecklist,
  useUploadDocument,
} from "@/app/lib/query/hooks";

type DashboardData = NonNullable<ReturnType<typeof useComplySaDashboard>["data"]>;
type Requirement = DashboardData["requirements"][number];

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  compliant: {
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
    icon: CheckCircle,
    label: "Compliant",
  },
  warning: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    icon: Clock,
    label: "Warning",
  },
  overdue: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    icon: AlertCircle,
    label: "Overdue",
  },
  in_progress: {
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    icon: Loader2,
    label: "In Progress",
  },
  not_applicable: {
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/30",
    icon: CheckCircle,
    label: "N/A",
  },
};

function statusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      color: "text-slate-400",
      bg: "bg-slate-500/10 border-slate-500/30",
      icon: CheckCircle,
      label: status,
    }
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig(status);
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ComplianceScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor =
    score >= 80
      ? "text-green-400 stroke-green-400"
      : score >= 50
        ? "text-yellow-400 stroke-yellow-400"
        : "text-red-400 stroke-red-400";

  return (
    <div className="relative w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-700"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={scoreColor}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor.split(" ")[0]}`}>{score}%</span>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{count}</p>
        </div>
        <Icon className={`h-8 w-8 ${color} opacity-50`} />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="w-28 h-28 rounded-full bg-slate-700" />
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-slate-700 rounded w-48" />
          <div className="h-4 bg-slate-700 rounded w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 bg-slate-700 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function RequirementCard({
  requirement,
  onChecklistToggle,
  onDocumentUpload,
}: {
  requirement: Requirement;
  onChecklistToggle: (reqId: string, stepIndex: number) => void;
  onDocumentUpload: (reqId: string, file: File) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedSteps = requirement.checklist.filter((s) => s.completed).length;
  const totalSteps = requirement.checklist.length;
  const progressPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onDocumentUpload(requirement.id, file);
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{requirement.name}</h3>
            <StatusBadge status={requirement.status} />
          </div>
          {requirement.nextDueDate && (
            <p className="text-xs text-slate-400">
              Due: {formatDateZA(requirement.nextDueDate)}
            </p>
          )}
          {totalSteps > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 shrink-0">
                {completedSteps}/{totalSteps}
              </span>
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400 shrink-0 ml-3" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 shrink-0 ml-3" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          <p className="text-sm text-slate-400">{requirement.description}</p>

          {totalSteps > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Checklist
              </h4>
              <div className="space-y-2">
                {requirement.checklist.map((item, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onChecklistToggle(requirement.id, index)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                    />
                    <span
                      className={`text-sm ${
                        item.completed
                          ? "text-slate-500 line-through"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {item.step}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Documents
            </h4>
            {requirement.documents.length > 0 ? (
              <div className="space-y-1">
                {requirement.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm text-slate-400">
                    <FileText className="h-4 w-4" />
                    <span>{doc.name}</span>
                    <span className="text-xs text-slate-500">
                      {formatDateZA(doc.uploadedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No documents uploaded</p>
            )}
            <label className="inline-flex items-center gap-2 mt-2 text-sm text-teal-400 hover:text-teal-300 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              Upload document
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  tax: "Tax & Revenue",
  corporate: "Corporate Governance",
  privacy: "Privacy & Data Protection",
  labour: "Labour & Employment",
};

export default function DashboardPage() {
  const { data, isLoading, error } = useComplySaDashboard();
  const toggleChecklist = useToggleChecklist();
  const uploadDocument = useUploadDocument();

  function handleChecklistToggle(reqId: string, stepIndex: number) {
    toggleChecklist.mutate({ requirementId: reqId, stepIndex });
  }

  function handleDocumentUpload(reqId: string, file: File) {
    uploadDocument.mutate({ file, requirementId: reqId });
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

  const categories = [...new Set(data.requirements.map((r) => r.category))];

  const groupedRequirements = categories.reduce(
    (acc, category) => ({
      ...acc,
      [category]: data.requirements.filter((r) => r.category === category),
    }),
    {} as Record<string, Requirement[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <ComplianceScoreRing score={data.complianceScore} />
        <div>
          <h1 className="text-2xl font-bold text-white">{data.companyName}</h1>
          <p className="text-slate-400 mt-1">Compliance Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Compliant"
          count={data.summary.compliant}
          color="text-green-400"
          icon={CheckCircle}
        />
        <SummaryCard
          label="Warnings"
          count={data.summary.warning}
          color="text-yellow-400"
          icon={AlertTriangle}
        />
        <SummaryCard
          label="Overdue"
          count={data.summary.overdue}
          color="text-red-400"
          icon={AlertCircle}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Upcoming Deadlines</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
          {data.upcomingDeadlines.length > 0 ? (
            data.upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-white">{deadline.requirementName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateZA(deadline.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${
                      deadline.daysRemaining <= 7
                        ? "text-red-400"
                        : deadline.daysRemaining <= 30
                          ? "text-yellow-400"
                          : "text-slate-400"
                    }`}
                  >
                    {deadline.daysRemaining} days
                  </span>
                  <StatusBadge status={deadline.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500 text-sm">No upcoming deadlines</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">All Requirements</h2>
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="space-y-2">
                {groupedRequirements[category].map((req) => (
                  <RequirementCard
                    key={req.id}
                    requirement={req}
                    onChecklistToggle={handleChecklistToggle}
                    onDocumentUpload={handleDocumentUpload}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
