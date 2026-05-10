import Link from "next/link";
import { FEATURE_DESCRIPTIONS } from "./constants";
import type { FeatureRestrictionPopupProps, RestrictionPopupPosition } from "./types";

export function RestrictionPopup({
  position,
  onClose,
}: {
  position: RestrictionPopupPosition;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed z-[100] bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 max-w-xs"
      style={{
        left: Math.min(position.x, window.innerWidth - 300),
        top: position.y + 10,
      }}
      onMouseLeave={onClose}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-sm font-medium">This option is restricted</p>
          <p className="text-xs text-gray-300 mt-1">
            Available on other pricing tiers.{" "}
            <Link
              href="/pricing"
              className="text-blue-400 hover:text-blue-300 underline"
              onClick={onClose}
            >
              View pricing
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeatureRestrictionPopup({
  feature,
  position,
  onClose,
}: FeatureRestrictionPopupProps) {
  const info = FEATURE_DESCRIPTIONS[feature];
  return (
    <div
      className="fixed z-[100] bg-slate-800 text-white px-4 py-4 rounded-lg shadow-xl border border-slate-600 max-w-md"
      style={{
        left: Math.min(position.x - 150, window.innerWidth - 450),
        top: Math.min(position.y + 10, window.innerHeight - 300),
      }}
      onMouseLeave={onClose}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400">{info.title}</p>
          <p className="text-xs text-gray-300 mt-1">{info.description}</p>
          <ul className="mt-2 space-y-1">
            {info.benefits.map((benefit, idx) => (
              <li key={idx} className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-slate-600">
            <p className="text-xs text-gray-300">
              This feature is available to registered users.{" "}
              <Link
                href="/register"
                className="text-blue-400 hover:text-blue-300 underline"
                onClick={onClose}
              >
                Create an account
              </Link>{" "}
              to access this assistant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
