"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import { useOrbitSeekerWhatsAppVerify } from "@/app/lib/query/hooks";

export interface SeekerWhatsAppVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string | null;
  reason?: string | null;
  onSent?: () => void;
}

export function SeekerWhatsAppVerifyModal(props: SeekerWhatsAppVerifyModalProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const propsDefaultPhone = props.defaultPhone;
  const defaultPhone = propsDefaultPhone ? propsDefaultPhone : "";
  const propsReason = props.reason;
  const reason = propsReason ? propsReason : null;
  const onSent = props.onSent;

  const verifyMutation = useOrbitSeekerWhatsAppVerify();
  const isSending = verifyMutation.isPending;

  const [phone, setPhone] = useState(defaultPhone);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone(defaultPhone);
      setSent(false);
      setErrorMessage(null);
    }
  }, [isOpen, defaultPhone]);

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

  if (!isOpen) return null;

  const handleSend = async () => {
    setErrorMessage(null);
    const trimmed = phone.trim();
    try {
      await verifyMutation.mutateAsync(trimmed.length > 0 ? trimmed : null);
      setSent(true);
      onSent?.();
    } catch (error) {
      const friendly = extractErrorMessage(
        error,
        "We couldn't send the WhatsApp message just now. Please try again in a moment.",
      );
      setErrorMessage(friendly);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seeker-whatsapp-verify-title"
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-[var(--brand-navbar,#323288)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-[var(--brand-navbar,#323288)]"
              style={{ backgroundColor: "var(--brand-accent,#FF8A00)" }}
              aria-hidden="true"
            >
              ✓
            </span>
            <h2 id="seeker-whatsapp-verify-title" className="text-lg font-semibold text-white">
              {sent ? "Check your WhatsApp" : "Verify your WhatsApp number"}
            </h2>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {sent ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                We've sent a WhatsApp message to your number. Open WhatsApp and reply to the message
                to confirm it's you — then come back here and try again.
              </p>
              <p className="text-sm text-gray-500">
                It can take a moment to arrive. Once you've replied, your free allowance is
                unlocked.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                To use your free allowance, please verify your WhatsApp number. This is a quick,
                one-time check that stops your allowance being reset by re-registering — so everyone
                gets a fair go.
              </p>
              <div className="space-y-1.5">
                <label
                  htmlFor="seeker-whatsapp-verify-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  WhatsApp number
                </label>
                <input
                  id="seeker-whatsapp-verify-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+27 ..."
                  disabled={isSending}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[var(--brand-navbar,#323288)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-navbar,#323288)] disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500">
                  We'll message this number on WhatsApp. Leave it as-is if it's already correct.
                </p>
              </div>
              {reason ? <p className="text-sm text-gray-600">{reason}</p> : null}
              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sent ? "Close" : "Not now"}
          </button>
          {!sent ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-navbar,#323288)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-navbar-active,#252560)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  Sending…
                </>
              ) : (
                "Send WhatsApp message"
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
