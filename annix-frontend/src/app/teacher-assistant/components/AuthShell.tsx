"use client";

import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell(props: AuthShellProps) {
  const { title, subtitle, children, footer } = props;
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFA500] rounded-2xl text-white mb-4 shadow-lg">
            <GraduationCap className="w-9 h-9" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          <p className="text-white/70 text-sm">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-white/10">{children}</div>
        {footer ? <div className="text-center mt-6 text-sm text-white/70">{footer}</div> : null}
      </div>
    </div>
  );
}
