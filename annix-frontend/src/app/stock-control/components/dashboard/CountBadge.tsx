"use client";

import Link from "next/link";

interface CountBadgeProps {
  count: number;
  label: string;
  href: string;
  variant?: "default" | "warning" | "danger" | "success" | "info";
}

const VARIANT_STYLES: Record<string, string> = {
  default: "bg-gray-50 hover:bg-gray-100 text-gray-700",
  warning: "bg-amber-50 hover:bg-amber-100 text-amber-800",
  danger: "bg-red-50 hover:bg-red-100 text-red-800",
  success: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800",
  info: "bg-blue-50 hover:bg-blue-100 text-blue-800",
};

const BADGE_STYLES: Record<string, string> = {
  default: "bg-gray-200 text-gray-800",
  warning: "bg-amber-200 text-amber-900",
  danger: "bg-red-200 text-red-900",
  success: "bg-emerald-200 text-emerald-900",
  info: "bg-blue-200 text-blue-900",
};

export function CountBadge(props: CountBadgeProps) {
  const { count, label, href } = props;
  const rawVariant = props.variant;
  const variant = rawVariant || "default";
  if (count === 0) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md text-gray-400">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium">0</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${VARIANT_STYLES[variant]}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-xs font-bold rounded-full ${BADGE_STYLES[variant]}`}
      >
        {count}
      </span>
    </Link>
  );
}

export function CountBadgeSkeleton() {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md">
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-5 w-6 bg-gray-200 rounded-full animate-pulse" />
    </div>
  );
}

export function LaneSkeleton({ title, color }: { title: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 ${color}`}>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-4 space-y-2">
        <CountBadgeSkeleton />
        <CountBadgeSkeleton />
        <CountBadgeSkeleton />
      </div>
    </div>
  );
}
