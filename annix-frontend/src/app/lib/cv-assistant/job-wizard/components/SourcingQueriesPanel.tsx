"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { useNixCall } from "../hooks/useNixCall";

export interface SourcingQueriesPanelProps {
  jobId: number;
}

export function SourcingQueriesPanel({ jobId }: SourcingQueriesPanelProps) {
  const { showToast } = useToast();
  const sourcing = useNixCall({
    operation: "sourcing-queries",
    label: "Nix is generating Boolean search strings…",
    fn: (id: number) => cvAssistantApiClient.nixSourcingQueries(id),
  });
  const data = sourcing.data;
  const isPending = sourcing.isPending;
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = () => {
    sourcing.mutate(jobId, {
      onError: () => showToast("Couldn't generate sourcing queries.", "error"),
    });
  };

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      showToast(`Copied ${label} query to clipboard`, "success");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast("Couldn't copy — try selecting the text manually.", "error");
    }
  };

  return (
    <div className="rounded-xl bg-white shadow-md border border-[#252560]/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#1a1a40]">Source candidates outside the funnel</h3>
          <p className="text-sm text-gray-600">
            Nix generates Boolean strings you can paste into LinkedIn, Indeed, and Google to find
            passive candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="text-sm px-4 py-2 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50"
        >
          {isPending ? "Nix thinking…" : data ? "Regenerate" : "Generate Boolean queries"}
        </button>
      </div>

      {data ? (
        <div className="space-y-3">
          <SourcingQueryRow
            label="LinkedIn"
            value={data.linkedin}
            copied={copied === "LinkedIn"}
            onCopy={() => handleCopy("LinkedIn", data.linkedin)}
          />
          <SourcingQueryRow
            label="Indeed"
            value={data.indeed}
            copied={copied === "Indeed"}
            onCopy={() => handleCopy("Indeed", data.indeed)}
          />
          <SourcingQueryRow
            label="Google"
            value={data.google}
            copied={copied === "Google"}
            onCopy={() => handleCopy("Google", data.google)}
          />
          {data.explanations.length > 0 ? (
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-500">
              {data.explanations.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface SourcingQueryRowProps {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}

function SourcingQueryRow({ label, value, copied, onCopy }: SourcingQueryRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-[#252560] font-semibold">
          {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-[#252560] hover:text-[#1a1a40]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="text-xs bg-[#f5f5fc] border border-[#e0e0f5] rounded p-2 whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}
