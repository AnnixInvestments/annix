"use client";

import type { ReactNode } from "react";

export interface StepShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function StepShell({ title, subtitle, children }: StepShellProps) {
  return (
    <section className="bg-white rounded-xl shadow-md border border-[#252560]/30 p-6 sm:p-8 space-y-6">
      <header>
        <h2 className="text-xl font-bold text-[#1a1a40]">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-[#1a1a40]">
        {children}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full px-4 py-2.5 border border-[#e0e0f5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] focus:border-transparent text-sm";

export const textareaClass = `${inputClass} min-h-[120px] resize-y`;

export const selectClass = `${inputClass} bg-white`;
