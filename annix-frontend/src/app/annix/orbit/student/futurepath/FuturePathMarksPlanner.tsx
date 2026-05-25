"use client";

import { useState } from "react";

interface PlannerResult {
  subject: string;
  mark: string | null;
  predictedMark: string | null;
}

interface FuturePathMarksPlannerProps {
  results: PlannerResult[];
}

function currentPercent(result: PlannerResult): number | null {
  const markValue = result.mark;
  const predictedValue = result.predictedMark;
  const source = markValue != null ? markValue : predictedValue;
  if (source == null) return null;
  const parsed = Number(source);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Deterministic marks-improvement planner (#304 Phase 2). No backend, no
 * fabricated resources — the learner sets a target per subject and we compute
 * the gap, rank where to focus, and split the available weeks proportionally to
 * the gaps. Generic study strategies only (no invented links).
 */
export default function FuturePathMarksPlanner(props: FuturePathMarksPlannerProps) {
  const [weeks, setWeeks] = useState("12");
  const [targets, setTargets] = useState<Record<string, string>>({});

  const scored = props.results.flatMap((result) => {
    const current = currentPercent(result);
    if (current == null) return [];
    const targetRaw = targets[result.subject];
    const targetStr = targetRaw || "";
    const parsedTarget = Number(targetStr);
    const target =
      targetStr.length > 0 && Number.isFinite(parsedTarget)
        ? Math.min(100, parsedTarget)
        : Math.min(100, current + 10);
    const gap = Math.max(0, target - current);
    return [{ subject: result.subject, current, target, gap }];
  });

  if (scored.length === 0) return null;

  const focusSubjects = scored.filter((s) => s.gap > 0).sort((a, b) => b.gap - a.gap);
  const totalGap = focusSubjects.reduce((sum, s) => sum + s.gap, 0);
  const parsedWeeks = Number(weeks);
  const totalWeeks =
    Number.isFinite(parsedWeeks) && parsedWeeks >= 1 ? Math.round(parsedWeeks) : 12;

  const plan = focusSubjects.map((s) => {
    const share = totalGap > 0 ? s.gap / totalGap : 0;
    const allocatedWeeks = Math.max(1, Math.round(share * totalWeeks));
    return { ...s, allocatedWeeks };
  });

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="font-medium text-gray-900 mb-1">Marks-improvement plan</h2>
      <p className="text-xs text-gray-500 mb-3">
        Set a target per subject and we'll show the gap and where to focus over the weeks you have.
        A guide to plan your effort — not a guarantee of results.
      </p>
      <label className="text-sm block mb-3">
        <span className="text-gray-600 mr-2">Weeks until your goal</span>
        <input
          value={weeks}
          onChange={(e) => setWeeks(e.target.value)}
          inputMode="numeric"
          className="w-20 rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <ul className="divide-y divide-gray-100">
        {scored.map((s) => {
          const targetRaw = targets[s.subject];
          const targetStr = targetRaw || "";
          return (
            <li key={s.subject} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex-1">
                <span className="font-medium">{s.subject}</span>{" "}
                <span className="text-gray-500">now {s.current}%</span>
              </span>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                target
                <input
                  value={targetStr}
                  onChange={(e) => setTargets((prev) => ({ ...prev, [s.subject]: e.target.value }))}
                  inputMode="numeric"
                  placeholder={`${s.target}`}
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <span className="w-16 text-right text-xs text-gray-500">
                {s.gap > 0 ? `+${s.gap}%` : "on track"}
              </span>
            </li>
          );
        })}
      </ul>

      {plan.length > 0 ? (
        <div className="mt-4 rounded bg-gray-50 border border-gray-200 p-3 text-sm">
          <p className="font-medium mb-1">Your focus plan ({totalWeeks} weeks)</p>
          <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
            {plan.map((s) => (
              <li key={s.subject}>
                <span className="font-medium">{s.subject}</span> — ~{s.allocatedWeeks} week
                {s.allocatedWeeks === 1 ? "" : "s"} of priority effort (close a {s.gap}% gap).
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Strategy: each week, do timed past-paper questions on your priority subject, mark them
            honestly, and take your wrong answers to your teacher. Review, don't just re-read.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-green-700">
          You're at or above your targets — keep it up and lock in those marks.
        </p>
      )}
    </section>
  );
}
