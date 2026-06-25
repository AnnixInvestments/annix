"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { toastError } from "@/app/lib/api/apiError";

interface CheckInboundEmailsButtonProps {
  onPolled?: () => void;
  className?: string;
}

// Manually triggers the inbound-email poll (the same job that runs hourly on
// weekdays) so the operator can pull a just-sent CTI/CDN/CoC straight away.
// Shared across every customer & supplier document page.
export function CheckInboundEmailsButton(props: CheckInboundEmailsButtonProps) {
  const { showToast } = useToast();
  const [isPolling, setIsPolling] = useState(false);

  const handlePoll = async () => {
    try {
      setIsPolling(true);
      const result = await adminApiClient.pollInboundEmailsNow();
      if (result.busy) {
        showToast("An email poll is already running — try again in a moment", "info");
        return;
      }
      showToast(
        result.processed > 0
          ? `Email check complete — ${result.processed} new message${result.processed === 1 ? "" : "s"} processed`
          : "Email check complete — no new emails found",
        "success",
      );
      props.onPolled?.();
    } catch (err) {
      toastError(showToast, err, "Failed to check inbound emails");
    } finally {
      setIsPolling(false);
    }
  };

  const baseClass =
    "inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50";
  const className = props.className ? `${baseClass} ${props.className}` : baseClass;

  return (
    <button type="button" onClick={handlePoll} disabled={isPolling} className={className}>
      <RefreshCw className={`w-4 h-4 mr-2 ${isPolling ? "animate-spin" : ""}`} />
      {isPolling ? "Checking…" : "Check for new emails"}
    </button>
  );
}
