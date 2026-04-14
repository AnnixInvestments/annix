"use client";

import Link from "next/link";

type BannerVariant = "info" | "warning" | "success" | "action";

interface NextActionBannerProps {
  icon: React.ReactNode;
  message: string;
  detail?: string | null;
  actionLabel?: string | null;
  actionHref?: string | null;
  onAction?: (() => void) | null;
  variant?: BannerVariant;
}

const VARIANT_STYLES: Record<BannerVariant, { container: string; icon: string; action: string }> = {
  info: {
    container: "bg-blue-50 border-blue-200",
    icon: "text-blue-500",
    action: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    icon: "text-amber-500",
    action: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  success: {
    container: "bg-green-50 border-green-200",
    icon: "text-green-500",
    action: "bg-green-600 hover:bg-green-700 text-white",
  },
  action: {
    container: "bg-teal-50 border-teal-200",
    icon: "text-teal-500",
    action: "bg-teal-600 hover:bg-teal-700 text-white",
  },
};

export function NextActionBanner({
  icon,
  message,
  detail,
  actionLabel,
  actionHref,
  onAction,
  variant = "action",
}: NextActionBannerProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`rounded-lg border p-4 flex items-center gap-4 animate-fade-in ${styles.container}`}
    >
      <div className={`flex-shrink-0 ${styles.icon}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{message}</p>
        {detail && <p className="text-xs text-gray-600 mt-0.5">{detail}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${styles.action}`}
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${styles.action}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface JobCardNextActionProps {
  currentStatus: string | null;
  canApprove: boolean;
  currentStep: string | null;
  currentStepLabel?: string | null;
  userRole: string | null;
  onApprove?: () => void;
  jobCardId: number;
  hasLineItems?: boolean;
}

export function JobCardNextAction({
  currentStatus,
  canApprove,
  currentStep,
  currentStepLabel,
  userRole,
  onApprove,
  jobCardId,
  hasLineItems,
}: JobCardNextActionProps) {
  const prompt = resolveJobCardPrompt(
    currentStatus,
    canApprove,
    currentStep,
    currentStepLabel ? currentStepLabel : null,
    userRole,
    hasLineItems,
  );
  if (!prompt) return null;

  const handleAction = prompt.actionType === "approve" && onApprove ? onApprove : null;
  const href =
    prompt.actionType === "navigate" && prompt.actionHref
      ? prompt.actionHref.replace("{id}", String(jobCardId))
      : null;

  return (
    <NextActionBanner
      icon={prompt.icon}
      message={prompt.message}
      detail={prompt.detail}
      actionLabel={prompt.actionLabel}
      actionHref={href}
      onAction={handleAction}
      variant={prompt.variant}
    />
  );
}

interface JobCardPrompt {
  icon: React.ReactNode;
  message: string;
  detail: string | null;
  actionLabel: string | null;
  actionType: "approve" | "navigate" | null;
  actionHref: string | null;
  variant: BannerVariant;
}

function resolveJobCardPrompt(
  currentStatus: string | null,
  canApprove: boolean,
  currentStep: string | null,
  currentStepLabel: string | null,
  userRole: string | null,
  hasLineItems?: boolean,
): JobCardPrompt | null {
  if (!currentStatus || currentStatus === "file_closed") return null;

  const uploadIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );

  const checkIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const clockIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  if (currentStatus === "draft") {
    if (hasLineItems) return null;
    return {
      icon: uploadIcon,
      message: "Upload supporting documents to proceed",
      detail: "Attach purchase orders, specifications, or drawings to move to the next step.",
      actionLabel: null,
      actionType: null,
      actionHref: null,
      variant: "info",
    };
  }

  if (currentStatus === "dispatched") {
    if (canApprove) {
      return {
        icon: checkIcon,
        message: "Confirm dispatch",
        detail: "Scan and dispatch items, then review and approve to complete.",
        actionLabel: "Review & Approve",
        actionType: "approve",
        actionHref: null,
        variant: "action",
      };
    }
    return {
      icon: clockIcon,
      message: "Awaiting dispatch confirmation",
      detail: "Waiting for dispatch to be confirmed.",
      actionLabel: null,
      actionType: null,
      actionHref: null,
      variant: "info",
    };
  }

  const fallbackLabel = currentStep
    ? currentStep.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "next step";
  const stepLabel = currentStepLabel ? currentStepLabel : fallbackLabel;

  if (canApprove) {
    return {
      icon: checkIcon,
      message: `Ready for your review: ${stepLabel}`,
      detail: "Review and approve to continue the workflow.",
      actionLabel: "Review & Approve",
      actionType: "approve",
      actionHref: null,
      variant: "action",
    };
  }

  return {
    icon: clockIcon,
    message: `Awaiting: ${stepLabel}`,
    detail: "This step is pending review and approval.",
    actionLabel: null,
    actionType: null,
    actionHref: null,
    variant: "info",
  };
}

interface DeliveryNextActionProps {
  extractionStatus: string | null;
  hasLinkedItems: boolean;
  extractedItemCount: number;
  userRole: string | null;
  onLinkToStock?: () => void;
}

export function DeliveryNextAction({
  extractionStatus,
  hasLinkedItems,
  extractedItemCount,
  userRole,
  onLinkToStock,
}: DeliveryNextActionProps) {
  const linkIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );

  const checkIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  if (hasLinkedItems) {
    return (
      <NextActionBanner
        icon={checkIcon}
        message="Items linked to inventory"
        detail="All extracted items have been added to stock."
        variant="success"
      />
    );
  }

  if (extractedItemCount > 0) {
    const canLink = userRole === "storeman" || userRole === "admin" || userRole === "manager";
    return (
      <NextActionBanner
        icon={linkIcon}
        message={`Link ${extractedItemCount} extracted item${extractedItemCount !== 1 ? "s" : ""} to your inventory`}
        detail="Items have been extracted from the document. Add them to stock to update quantities."
        actionLabel={canLink ? "Add to Stock" : null}
        onAction={canLink ? onLinkToStock : null}
        variant="action"
      />
    );
  }

  return null;
}

interface InvoiceNextActionProps {
  extractionStatus: string;
  pendingClarificationCount: number;
  hasPriceChanges: boolean;
  userRole: string | null;
  onApprove?: () => void;
}

export function InvoiceNextAction({
  extractionStatus,
  pendingClarificationCount,
  hasPriceChanges,
  userRole,
  onApprove,
}: InvoiceNextActionProps) {
  const questionIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const checkIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const priceIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const clockIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  if (extractionStatus === "needs_clarification" && pendingClarificationCount > 0) {
    const canClarify = userRole === "accounts" || userRole === "admin" || userRole === "manager";
    return (
      <NextActionBanner
        icon={questionIcon}
        message={`Answer ${pendingClarificationCount} question${pendingClarificationCount !== 1 ? "s" : ""} to continue`}
        detail="Some invoice items could not be matched automatically. Review and resolve each one."
        actionLabel={canClarify ? "Resolve" : null}
        variant="warning"
      />
    );
  }

  if (extractionStatus === "awaiting_approval") {
    const canApproveRole =
      userRole === "accounts" || userRole === "manager" || userRole === "admin";
    if (hasPriceChanges) {
      return (
        <NextActionBanner
          icon={priceIcon}
          message="Approval required for price changes"
          detail="This invoice contains price updates that need review before applying."
          actionLabel={canApproveRole ? "Review & Approve" : null}
          onAction={canApproveRole ? onApprove : null}
          variant="warning"
        />
      );
    }
    return (
      <NextActionBanner
        icon={checkIcon}
        message="Review prices and approve"
        detail="Invoice items have been matched. Review and approve to update stock prices."
        actionLabel={canApproveRole ? "Approve" : null}
        onAction={canApproveRole ? onApprove : null}
        variant="action"
      />
    );
  }

  if (extractionStatus === "processing") {
    return (
      <NextActionBanner
        icon={clockIcon}
        message="Invoice is being processed"
        detail="AI is extracting and matching line items. This usually takes a few moments."
        variant="info"
      />
    );
  }

  if (extractionStatus === "completed") {
    return null;
  }

  return null;
}
