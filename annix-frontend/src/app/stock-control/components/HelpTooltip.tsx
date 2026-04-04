"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDisclosure } from "@/app/lib/hooks/useDisclosure";
import { useGlossary } from "../context/GlossaryContext";

interface HelpTooltipProps {
  term: string;
  inline?: boolean;
}

export function HelpTooltip(props: HelpTooltipProps) {
  const { term } = props;
  const inline = props.inline ?? true;
  const { termsByAbbreviation, hideTooltips } = useGlossary();
  const { isOpen, open, close, toggle } = useDisclosure();
  const [position, setPosition] = useState<"above" | "below">("below");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const glossaryTerm = termsByAbbreviation.get(term.toUpperCase());

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      setPosition("above");
    } else {
      setPosition("below");
    }
  }, []);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      calculatePosition();
    }
    toggle();
  }, [isOpen, calculatePosition, toggle]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  if (hideTooltips || !glossaryTerm) {
    return null;
  }

  const positionClasses = position === "above" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span className={inline ? "relative inline-flex items-center" : "relative flex items-center"}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => {
          calculatePosition();
          open();
        }}
        onMouseLeave={close}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full cursor-help transition-colors flex-shrink-0"
        aria-label={`Help: ${glossaryTerm.term}`}
      >
        ?
      </button>
      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-[9999] ${positionClasses} left-1/2 -translate-x-1/2 w-72 max-w-[calc(100vw-2rem)]`}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 text-sm">
            <div className="font-semibold text-teal-300 mb-1">
              {glossaryTerm.abbreviation} — {glossaryTerm.term}
            </div>
            <p className="text-gray-200 text-xs leading-relaxed">{glossaryTerm.definition}</p>
            <a
              href="/stock-control/portal/glossary"
              className="inline-block mt-2 text-xs text-teal-400 hover:text-teal-300 underline"
              onClick={(e) => e.stopPropagation()}
            >
              View full glossary
            </a>
          </div>
        </div>
      )}
    </span>
  );
}
