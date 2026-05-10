import Link from "next/link";
import type { RestrictionPopupPosition } from "./types";

export function RestrictionTooltip({ position }: { position: RestrictionPopupPosition }) {
  return (
    <div
      className="fixed z-50 bg-gray-900 dark:bg-gray-800 text-white rounded-md shadow-lg px-3 py-2 max-w-xs pointer-events-none"
      style={{
        left: Math.min(position.x, window.innerWidth - 280),
        top: position.y + 10,
      }}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-xs">
          Restricted feature.{" "}
          <Link href="/pricing" className="text-blue-400 hover:text-blue-300 underline">
            View pricing tiers
          </Link>
        </span>
      </div>
      <div
        className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"
        style={{ transform: "translateY(-50%) rotate(45deg)" }}
      />
    </div>
  );
}
