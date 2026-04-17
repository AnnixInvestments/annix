"use client";

import { Award, FileText, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useBbeeCalculate, useBbeeScorecardElements } from "@/app/lib/query/hooks";

type BbeeResult = {
  category: string;
  level: string | null;
  description: string;
  procurementRecognition: number | null;
  requiresVerification: boolean;
};

type ScorecardElement = { element: string; weighting: number; description: string };

const LEVEL_COLORS: Record<string, string> = {
  "Level 1": "from-teal-500 to-emerald-500",
  "Level 2": "from-teal-600 to-cyan-500",
  "Level 4": "from-cyan-600 to-blue-500",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    EME: "bg-green-500/20 text-green-400 border-green-500/30",
    QSE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Generic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const colorLookup = colorMap[category];
  const badgeColor = colorLookup || "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${badgeColor}`}
    >
      {category}
    </span>
  );
}

function ResultCard({ result }: { result: BbeeResult }) {
  const levelColor = result.level ? LEVEL_COLORS[result.level] : null;
  const gradientClass = levelColor || "from-slate-600 to-slate-500";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br p-[1px]">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-20`} />
      <div className="relative bg-slate-800/90 backdrop-blur rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <CategoryBadge category={result.category} />
          {result.level && (
            <span
              className={`text-2xl font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent animate-pulse`}
            >
              {result.level}
            </span>
          )}
          {result.requiresVerification && (
            <span className="text-sm font-medium text-yellow-400">Requires Full Verification</span>
          )}
        </div>

        <p className="text-sm text-slate-300">{result.description}</p>

        {result.procurementRecognition !== null && (
          <div className="bg-slate-900/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Procurement Recognition Level
            </p>
            <p className="text-3xl font-bold text-teal-400 mt-1">
              {result.procurementRecognition}%
            </p>
          </div>
        )}

        {!result.requiresVerification && (
          <Link
            href="/comply-sa/templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg text-sm font-medium transition-colors"
          >
            <FileText className="h-4 w-4" />
            Generate Affidavit
          </Link>
        )}
      </div>
    </div>
  );
}

function ScorecardTable({ elements }: { elements: ScorecardElement[] }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Info className="h-4 w-4 text-teal-400" />
          B-BBEE Scorecard Elements
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Element
              </th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Weighting
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {elements.map((el) => (
              <tr key={el.element} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-sm text-white font-medium">{el.element}</td>
                <td className="px-4 py-3 text-sm text-teal-400 text-right font-semibold">
                  {el.weighting}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 hidden sm:table-cell">
                  {el.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BbeePage() {
  const [turnover, setTurnover] = useState("");
  const [ownership, setOwnership] = useState(51);
  const { data: scorecardElements } = useBbeeScorecardElements();
  const calculateMutation = useBbeeCalculate();

  const elements: ScorecardElement[] = Array.isArray(scorecardElements) ? scorecardElements : [];
  const mutationData = calculateMutation.data;
  const result: BbeeResult | null = mutationData || null;

  function handleCalculate() {
    const numericTurnover = Number(turnover.replace(/[^0-9.]/g, ""));
    if (!numericTurnover || numericTurnover <= 0) {
      return;
    }

    calculateMutation.mutate({ turnover: numericTurnover, blackOwnershipPercent: ownership });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Award className="h-7 w-7 text-teal-400" />
          B-BBEE Simulator
        </h1>
        <p className="text-slate-400 mt-1">Calculate your enterprise category and B-BBEE level</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Annual Turnover (ZAR)
          </label>
          <input
            type="text"
            value={turnover}
            onChange={(e) => setTurnover(e.target.value)}
            placeholder="e.g. 5000000"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Black Ownership: {ownership}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={ownership}
            onChange={(e) => setOwnership(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {calculateMutation.error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {calculateMutation.error.message}
          </div>
        )}

        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculateMutation.isPending}
          className="w-full sm:w-auto px-6 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {calculateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            "Calculate B-BBEE Level"
          )}
        </button>
      </div>

      {result && <ResultCard result={result} />}

      {elements.length > 0 && <ScorecardTable elements={elements} />}
    </div>
  );
}
