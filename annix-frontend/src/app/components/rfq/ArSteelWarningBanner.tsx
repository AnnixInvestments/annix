"use client";

import { isWearResistantSteel } from "@/app/lib/config/rfq/materialLimits";
import { AR_STEEL_GRADES, isArSteelSpec } from "@/app/lib/config/rfq/pipeSchedules";

interface ArSteelWarningBannerProps {
  steelSpecName: string | undefined;
  className?: string;
}

export function ArSteelWarningBanner({ steelSpecName, className = "" }: ArSteelWarningBannerProps) {
  if (!steelSpecName) return null;

  const isArSteel = isWearResistantSteel(steelSpecName) || isArSteelSpec(steelSpecName);

  if (!isArSteel) return null;

  const gradeInfo = AR_STEEL_GRADES.find((g) =>
    steelSpecName.toUpperCase().includes(g.grade.toUpperCase()),
  );

  return (
    <div
      className={`p-3 bg-orange-50 border-2 border-orange-400 rounded-lg ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-orange-800">
            Wear-Resistant Steel Selected - NOT FOR PRESSURE SERVICE
          </h4>
          <div className="mt-1 text-xs text-orange-700 space-y-1">
            <p>
              <strong>{steelSpecName}</strong> is a hardness-rated abrasion-resistant steel designed
              for wear liner applications only.
            </p>
            {gradeInfo && (
              <p>
                Hardness: <strong>{gradeInfo.hardnessBHN} BHN</strong> | Max Temp:{" "}
                <strong>{gradeInfo.maxTempC}°C</strong> (softens above this)
              </p>
            )}
            <ul className="list-disc list-inside mt-2 space-y-0.5">
              <li>
                Cannot be used for pressure-rated piping without specific engineering analysis
              </li>
              <li>Intended for wear liners, chutes, hoppers, and abrasion protection only</li>
              <li>Will soften and lose hardness if heated above 200°C</li>
              <li>Higher hardness grades (AR500) are more brittle - not for impact zones</li>
            </ul>
          </div>
          <div className="mt-2 pt-2 border-t border-orange-200">
            <p className="text-xs text-orange-800 font-medium">
              For pressure service, use: ASTM A106, ASTM A335 (alloy), or ASTM A312 (stainless)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
