"use client";

import { ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: "top" | "bottom";
  align?: "center" | "end";
  disabled?: boolean;
}

export function Tooltip(props: TooltipProps) {
  const { children, text, position = "bottom", align = "center", disabled = false } = props;
  const positionClasses = position === "top" ? "bottom-full mb-2" : "top-full mt-2";
  // "end" anchors the tooltip's right edge to the trigger so it extends inward
  // — required for triggers near the viewport edge, where a centred tooltip
  // would overflow the document and create a page-wide horizontal scrollbar.
  const alignClasses = align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div className="relative group">
      {children}
      {disabled ? null : (
        <span
          className={`absolute ${alignClasses} ${positionClasses} px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg`}
        >
          {text}
        </span>
      )}
    </div>
  );
}
