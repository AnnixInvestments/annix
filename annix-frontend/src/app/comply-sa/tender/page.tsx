"use client";

import {
  CheckCircle,
  Download,
  Eye,
  FileCheck,
  Info,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  useTenderChecklist,
  useTenderScore,
  useUploadTenderDocument,
} from "@/app/lib/query/hooks";

type ChecklistItem = {
  id: string;
  name: string;
  description: string;
  uploaded: boolean;
  documentUrl: string | null;
};

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor =
    score >= 80
      ? "text-green-400 stroke-green-400"
      : score >= 50
        ? "text-yellow-400 stroke-yellow-400"
        : "text-red-400 stroke-red-400";

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor.split(" ")[0]}`}>{score}%</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ready</span>
      </div>
    </div>
  );
}

function ChecklistCard({
  item,
  onUpload,
}: {
  item: ChecklistItem;
  onUpload: (itemId: string, file: File) => void;
}) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(item.id, file);
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-4">
      <div className="shrink-0 mt-0.5">
        {item.uploaded ? (
          <CheckCircle className="h-6 w-6 text-green-400" />
        ) : (
          <XCircle className="h-6 w-6 text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white">{item.name}</h3>
        <p className="text-xs text-slate-400 mt-1">{item.description}</p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {item.uploaded && item.documentUrl ? (
          <>
            <a
              href={item.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-teal-400 transition-colors"
              title="View document"
            >
              <Eye className="h-4 w-4" />
            </a>
            <a
              href={item.documentUrl}
              download
              className="p-2 text-slate-400 hover:text-teal-400 transition-colors"
              title="Download document"
            >
              <Download className="h-4 w-4" />
            </a>
          </>
        ) : (
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg text-xs font-medium cursor-pointer transition-colors">
            <Upload className="h-3.5 w-3.5" />
            Upload
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 rounded-full bg-slate-700" />
        <div className="space-y-3">
          <div className="h-6 bg-slate-700 rounded w-48" />
          <div className="h-4 bg-slate-700 rounded w-32" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function TenderPage() {
  const { data: checklist, isLoading: checklistLoading, error: checklistError } = useTenderChecklist();
  const { data: score, isLoading: scoreLoading } = useTenderScore();
  const uploadMutation = useUploadTenderDocument();
  const [uploading, setUploading] = useState<string | null>(null);

  const isLoading = checklistLoading || scoreLoading;

  function handleUpload(itemId: string, file: File) {
    setUploading(itemId);
    uploadMutation.mutate(
      { file, requirementId: itemId },
      { onSettled: () => setUploading(null) },
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  const error = checklistError ?? uploadMutation.error;

  if (checklistError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
        {checklistError.message}
      </div>
    );
  }

  const checklistItems = (checklist ?? []) as ChecklistItem[];
  const uploadedCount = checklistItems.filter((item) => item.uploaded).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileCheck className="h-7 w-7 text-teal-400" />
          Tender Pack
        </h1>
        <p className="text-slate-400 mt-1">Government tender readiness checklist</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center gap-2">
        <Info className="h-5 w-5 text-teal-400 shrink-0" />
        <p className="text-sm text-slate-300">
          Government tenders require specific compliance documents. This checklist shows your
          readiness to submit a tender application.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800 border border-slate-700 rounded-xl p-6">
        {score && <ScoreRing score={score.score} />}
        <div>
          <h2 className="text-lg font-semibold text-white">Tender Readiness</h2>
          <p className="text-slate-400 mt-1">
            <span className="text-teal-400 font-bold">{uploadedCount}</span> of{" "}
            <span className="font-bold text-white">{checklistItems.length}</span> documents ready
          </p>
          {score && score.score === 100 && (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400">
              <CheckCircle className="h-4 w-4" />
              Fully Tender Ready
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {checklistItems.map((item) => (
          <div key={item.id} className="relative">
            {uploading === item.id && (
              <div className="absolute inset-0 bg-slate-900/50 rounded-xl flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
              </div>
            )}
            <ChecklistCard item={item} onUpload={handleUpload} />
          </div>
        ))}
      </div>
    </div>
  );
}
