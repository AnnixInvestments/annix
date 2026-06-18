"use client";

export interface WhatsAppConsentCellProps {
  optIn: boolean;
  requestedAt?: string | null;
  phone?: string | null;
}

/**
 * Compact WhatsApp consent status badge for any user/seeker table.
 *
 *  - opted in            → green "Yes" (with a ✓ and the phone, when present)
 *  - requested, not yet  → amber "Requested"
 *  - neither             → grey "No"
 *
 * SWC-safe: every member/optional access is hoisted to a local const before
 * any `||` / `??` use.
 */
export function WhatsAppConsentCell(props: WhatsAppConsentCellProps) {
  const optIn = props.optIn;
  const requestedAt = props.requestedAt;
  const phone = props.phone;

  if (optIn) {
    const phoneLabel = phone || null;
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Yes
        </span>
        {phoneLabel ? (
          <span className="text-xs text-gray-500 tabular-nums">{phoneLabel}</span>
        ) : null}
      </span>
    );
  }

  const hasRequest = Boolean(requestedAt);
  if (hasRequest) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        Requested
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      No
    </span>
  );
}
