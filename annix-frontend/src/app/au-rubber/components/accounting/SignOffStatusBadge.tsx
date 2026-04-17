"use client";

interface SignOffStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  GENERATED: { bg: "bg-blue-100", text: "text-blue-700", label: "Generated" },
  PENDING_SIGNOFF: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending Sign-Off" },
  SIGNED_OFF: { bg: "bg-green-100", text: "text-green-700", label: "Signed Off" },
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  APPROVED: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  EXTRACTING: { bg: "bg-blue-100", text: "text-blue-700", label: "Extracting" },
  MATCHED: { bg: "bg-green-100", text: "text-green-700", label: "Matched" },
  DISCREPANCY: { bg: "bg-amber-100", text: "text-amber-700", label: "Discrepancy" },
  RESOLVED: { bg: "bg-green-100", text: "text-green-700", label: "Resolved" },
};

export function SignOffStatusBadge(props: SignOffStatusBadgeProps) {
  const rawSTATUS_STYLESByPropsstatus = STATUS_STYLES[props.status];
  const style = rawSTATUS_STYLESByPropsstatus || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: props.status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
