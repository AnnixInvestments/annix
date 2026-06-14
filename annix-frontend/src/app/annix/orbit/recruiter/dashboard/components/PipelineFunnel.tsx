"use client";

import type { OrbitPipelineStageRow } from "@/app/lib/api/annixOrbitApi";

const STAGE_COLORS = ["#7c3aed", "#6366f1", "#3b82f6", "#0ea5e9", "#f59e0b", "#f97316", "#10b981"];

export function PipelineFunnel(props: { stages: OrbitPipelineStageRow[]; conversionRate: number }) {
  const stages = props.stages;
  return (
    <div>
      <ul className="space-y-2">
        {stages.map((stage, index) => {
          const color = STAGE_COLORS[index];
          return (
            <li key={stage.key} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-gray-600 dark:text-[#c0c0eb]">
                {stage.label}
              </span>
              <span className="w-10 shrink-0 text-sm font-semibold text-[#252560] dark:text-white text-right">
                {stage.count}
              </span>
              <div className="flex-1 h-4 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(stage.pct, 1.5)}%`,
                    backgroundColor: color ?? "#7c3aed",
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-xs text-gray-400 text-right">{stage.pct}%</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-2">
        <span className="text-xs text-gray-500 dark:text-[#c0c0eb]">Conversion rate</span>
        <span className="text-sm font-bold text-[#7c3aed]">{props.conversionRate}%</span>
      </div>
    </div>
  );
}
