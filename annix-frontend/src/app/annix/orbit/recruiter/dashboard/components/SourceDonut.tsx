"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { OrbitSourceBreakdownItem } from "@/app/lib/api/annixOrbitApi";

const SOURCE_COLORS: Record<string, string> = {
  database: "#7c3aed",
  referral: "#3b82f6",
  website: "#10b981",
  social: "#f59e0b",
  job_board: "#ef4444",
  other: "#14b8a6",
};

export function SourceDonut(props: { total: number; items: OrbitSourceBreakdownItem[] }) {
  const total = props.total;
  const items = props.items;
  if (items.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
        No candidate sources yet.
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {items.map((item) => {
                const color = SOURCE_COLORS[item.source];
                return <Cell key={item.source} fill={color ?? "#9ca3af"} />;
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-[#252560] dark:text-white">{total}</span>
          <span className="text-[11px] text-gray-400">Total</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 w-full">
        {items.map((item) => {
          const color = SOURCE_COLORS[item.source];
          return (
            <li key={item.source} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-gray-600 dark:text-[#c0c0eb]">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color ?? "#9ca3af" }}
                />
                {item.label}
              </span>
              <span className="text-gray-500">
                {item.pct}% ({item.count})
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
