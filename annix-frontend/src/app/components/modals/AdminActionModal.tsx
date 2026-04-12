"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AdminAction = "approve" | "suspend" | "reject";
type EntityType = "customer" | "supplier";

export interface AdminActionModalProps {
  action: AdminAction;
  entityType: EntityType;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string, remediationSteps?: string) => void;
  loading?: boolean;
}

const ACTION_CONFIG = {
  approve: {
    title: (entityType: EntityType) =>
      `Approve ${entityType === "customer" ? "Customer" : "Supplier"} Onboarding`,
    gradientFrom: "from-green-600",
    gradientTo: "to-emerald-600",
    confirmBg: "bg-green-600 hover:bg-green-700",
    infoBg: "bg-green-50",
    infoBorder: "border-green-200",
    infoTitle: "text-green-800",
    infoText: "text-green-700",
    checkColor: "fill-current",
    confirmLabel: (entityType: EntityType) =>
      `Approve ${entityType === "customer" ? "Customer" : "Supplier"}`,
    loadingLabel: "Approving...",
    reasonRequired: false,
  },
  suspend: {
    title: (entityType: EntityType) =>
      `Suspend ${entityType === "customer" ? "Customer" : "Supplier"} Account`,
    gradientFrom: "from-amber-600",
    gradientTo: "to-orange-600",
    confirmBg: "bg-red-600 hover:bg-red-700",
    infoBg: "bg-amber-50",
    infoBorder: "border-amber-200",
    infoTitle: "text-amber-800",
    infoText: "text-amber-700",
    checkColor: "fill-current",
    confirmLabel: () => "Suspend Account",
    loadingLabel: "Suspending...",
    reasonRequired: true,
  },
  reject: {
    title: (entityType: EntityType) =>
      `Reject ${entityType === "customer" ? "Customer" : "Supplier"} Onboarding`,
    gradientFrom: "from-red-600",
    gradientTo: "to-rose-600",
    confirmBg: "bg-red-600 hover:bg-red-700",
    infoBg: "bg-red-50",
    infoBorder: "border-red-200",
    infoTitle: "text-red-800",
    infoText: "text-red-700",
    checkColor: "fill-current",
    confirmLabel: () => "Reject Onboarding",
    loadingLabel: "Rejecting...",
    reasonRequired: true,
  },
};

const ACTION_EFFECTS: Record<AdminAction, Record<EntityType, string[]>> = {
  approve: {
    customer: [
      "Activate the customer account",
      "Send a confirmation email",
      "Record your approval with timestamp",
    ],
    supplier: [
      "Activate the supplier account",
      "Send a confirmation email",
      "Record your approval with timestamp",
    ],
  },
  suspend: {
    customer: [
      "Immediately disable account access",
      "Notify the customer via email",
      "Record the suspension reason",
    ],
    supplier: [
      "Immediately disable account access",
      "Notify the supplier via email",
      "Record the suspension reason",
    ],
  },
  reject: {
    customer: [
      "Reject the onboarding application",
      "Notify the customer with remediation steps",
      "Record the rejection reason",
    ],
    supplier: [
      "Reject the onboarding application",
      "Notify the supplier with remediation steps",
      "Record the rejection reason",
    ],
  },
};

const ACTION_ICONS: Record<AdminAction, string> = {
  approve: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  suspend:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  reject: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
};

export function AdminActionModal(props: AdminActionModalProps) {
  const propsLoading = props.loading;
  const loading = propsLoading ? propsLoading : false;
  const [reason, setReason] = useState("");
  const [remediation, setRemediation] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const action = props.action;

  const config = ACTION_CONFIG[action];
  const effects = ACTION_EFFECTS[action][props.entityType];
  const iconPath = ACTION_ICONS[action];

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setRemediation("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const reasonValue = reason.trim() || undefined;
    const remediationValue = remediation.trim() || undefined;
    props.onConfirm(reasonValue, remediationValue);
  };

  const confirmDisabled =
    loading ||
    (config.reasonRequired && !reason.trim()) ||
    (action === "reject" && !remediation.trim());
  const titleText = config.title(props.entityType);
  const confirmText = config.confirmLabel(props.entityType);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-action-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className={`bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
              </svg>
            </div>
            <h3 id="admin-action-modal-title" className="text-lg font-semibold text-white">
              {titleText}
            </h3>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4">
            You are about to {action} <strong>{props.entityName}</strong>.
          </p>

          <div className={`${config.infoBg} border ${config.infoBorder} rounded-lg p-4 mb-4`}>
            <h4 className={`text-sm font-medium ${config.infoTitle} mb-2`}>This action will:</h4>
            <ul className={`text-sm ${config.infoText} space-y-1`}>
              {effects.map((effect) => (
                <li key={effect} className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {effect}
                </li>
              ))}
            </ul>
          </div>

          {(action === "suspend" || action === "reject") && (
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {action === "suspend" ? "Reason for Suspension" : "Rejection Reason"}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    action === "suspend"
                      ? "Enter reason for suspension..."
                      : "Why is the onboarding being rejected?"
                  }
                />
              </div>
              {action === "reject" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remediation Steps
                  </label>
                  <textarea
                    value={remediation}
                    onChange={(e) => setRemediation(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What should they do to address this?"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              className={`px-4 py-2 ${config.confirmBg} text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {config.loadingLabel}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={action === "approve" ? "M5 13l4 4L19 7" : iconPath}
                    />
                  </svg>
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
