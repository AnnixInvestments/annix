"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_HUB = "/admin/portal/global-apps";

// Top-level pages whose logical parent differs from their URL parent (they sit
// at /admin/portal/<x> but belong under a hub).
const TOP_LEVEL_PARENT_OVERRIDES: Record<string, { href: string; label: string }> = {
  "education-ingestion": { href: "/admin/portal/orbit", label: "Orbit" },
};

// Segments whose humanised form needs a specific casing/acronym.
const LABEL_OVERRIDES: Record<string, string> = {
  rfqs: "RFQs",
  "hdpe-fittings": "HDPE Fittings",
  "pvc-fittings": "PVC Fittings",
  "ee-targets": "EE Targets",
  "ai-usage": "AI Usage",
  "sso-reconciliation": "SSO Reconciliation",
  "global-apps": "Global Apps",
  "global-messages": "Global Messages",
  "extraction-metrics": "Extraction Metrics",
  "company-profile": "Company Profile",
  "education-ingestion": "Education Ingestion",
  "education-catalog": "Education Catalog",
  "job-market": "Job Market",
  "credential-types": "Credential Types",
  "delist-reports": "Delist Reports",
  "dismiss-reasons": "Dismiss Reasons",
  "seeker-tiers": "Seeker Tiers",
  "polling-jobs": "Polling Jobs",
  "scheduled-jobs": "Scheduled Jobs",
  "promo-codes": "Promo Codes",
  "reference-data": "Reference Data",
  "response-metrics": "Response Metrics",
  "secure-documents": "Secure Documents",
  "inbound-emails": "Inbox Emails",
  "pricing-tiers": "Pricing Tiers",
};

function humanize(segment: string): string {
  const override = LABEL_OVERRIDES[segment];
  if (override) return override;
  return segment
    .split("-")
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function singularize(label: string): string {
  if (label === "RFQs") return "RFQ";
  if (label.endsWith("ies")) return `${label.slice(0, -3)}y`;
  if (label.endsWith("s")) return label.slice(0, -1);
  return label;
}

function resolveBack(pathname: string): { href: string; label: string } | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "admin" || segments[1] !== "portal") return null;
  const rest = segments.slice(2);
  const first = rest[0];

  // The hub itself has nothing above it.
  if (rest.length === 0 || first === "global-apps") return null;

  // Routes whose path-parent is not a real page → nearest real ancestor.
  if (first === "branding") return { href: MAIN_HUB, label: "Main Hub" };
  if (first === "users" && rest.length > 1) return { href: "/admin/portal/users", label: "Users" };

  // Top-level page → its hub override, else Main Hub.
  if (rest.length === 1) {
    const override = TOP_LEVEL_PARENT_OVERRIDES[first];
    if (override) return override;
    return { href: MAIN_HUB, label: "Main Hub" };
  }

  const parent = rest.slice(0, -1);

  // An "edit" sub-page goes back to its detail parent, labelled by the entity.
  if (rest[rest.length - 1] === "edit") {
    const listSegment = parent[parent.length - 2];
    const listLabel = listSegment ? humanize(listSegment) : "Item";
    return { href: `/admin/portal/${parent.join("/")}`, label: singularize(listLabel) };
  }

  // Any other nested page goes back to its path parent.
  const parentSegment = parent[parent.length - 1];
  return {
    href: `/admin/portal/${parent.join("/")}`,
    label: parentSegment ? humanize(parentSegment) : "Main Hub",
  };
}

export function AdminBackButton() {
  const pathname = usePathname();
  const back = resolveBack(pathname);
  if (!back) return null;

  return (
    <div className="mb-4">
      <Link
        href={back.href}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to {back.label}
      </Link>
    </div>
  );
}
