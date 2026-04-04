const STATIC_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  admin_approval: "bg-yellow-100 text-yellow-800",
  manager_approval: "bg-orange-100 text-orange-800",
  quality_check: "bg-blue-100 text-blue-800",
  dispatched: "bg-teal-100 text-teal-800",
  file_closed: "bg-slate-100 text-slate-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-purple-100 text-purple-800",
  received: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  needs_clarification: "bg-yellow-100 text-yellow-800",
  awaiting_approval: "bg-purple-100 text-purple-800",
  fulfilled: "bg-blue-100 text-blue-800",
  document_uploaded: "bg-yellow-100 text-yellow-800",
  admin_approved: "bg-orange-100 text-orange-800",
  manager_approved: "bg-blue-100 text-blue-800",
  requisition_sent: "bg-indigo-100 text-indigo-800",
  stock_allocated: "bg-blue-100 text-blue-800",
  ready_for_dispatch: "bg-emerald-100 text-emerald-800",
  pending_admin: "bg-yellow-100 text-yellow-800",
  pending_manager: "bg-orange-100 text-orange-800",
  pending_allocation: "bg-blue-100 text-blue-800",
};

const DYNAMIC_PALETTE = [
  "bg-cyan-100 text-cyan-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
  "bg-lime-100 text-lime-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-sky-100 text-sky-800",
  "bg-pink-100 text-pink-800",
];

const DEFAULT_COLOR = "bg-gray-100 text-gray-800";

const hashCode = (str: string): number =>
  str.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);

export const statusColorClasses = (status: string): string => {
  const key = status.toLowerCase();
  const staticMatch = STATIC_STATUS_COLORS[key];
  if (staticMatch) return staticMatch;

  const paletteIndex = Math.abs(hashCode(key)) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[paletteIndex];
};

export { DEFAULT_COLOR, STATIC_STATUS_COLORS };
