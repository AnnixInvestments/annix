"use client";

import { Pencil, RotateCcw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface EditableSectionProps {
  title: string;
  isEdited: boolean;
  onRestore: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  children: ReactNode;
}

export function EditableSection(props: EditableSectionProps) {
  const { title, isEdited, onRestore, onRegenerate, isRegenerating, children } = props;
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <header className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {isEdited ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#FFE0A0] text-[#92400e]">
              <Pencil className="w-3 h-3" />
              edited
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isEdited ? (
            <button
              type="button"
              onClick={onRestore}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-sm text-gray-600 hover:text-[#323288] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore original
            </button>
          ) : null}
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-sm text-[#323288] hover:text-[#252560] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isRegenerating ? "Regenerating…" : "Regenerate"}
            </button>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}
