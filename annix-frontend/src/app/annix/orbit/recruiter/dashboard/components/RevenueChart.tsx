"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OrbitRevenuePoint } from "@/app/lib/api/annixOrbitApi";

function shortRand(value: number): string {
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R${Math.round(value / 1_000)}K`;
  return `R${value}`;
}

function dayLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number.parseInt(day, 10)}/${Number.parseInt(month, 10)}`;
}

export function RevenueChart(props: { series: OrbitRevenuePoint[] }) {
  const series = props.series;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="orbitRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={dayLabel}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          minTickGap={24}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={shortRand}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          width={48}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`R${Number(value).toLocaleString("en-ZA")}`, "Revenue"]}
          labelFormatter={(label) => String(label)}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#7c3aed"
          strokeWidth={2}
          fill="url(#orbitRevenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
