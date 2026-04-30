"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Toast, ToastContext, type ToastType } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";

const DEFAULT_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 7000,
  error: 10000,
};

const ACCENT_BY_TYPE: Record<
  ToastType,
  { stripe: string; iconBg: string; iconColor: string; label: string }
> = {
  success: {
    stripe: "bg-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    label: "Success",
  },
  info: {
    stripe: "bg-sky-500",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    label: "Info",
  },
  warning: {
    stripe: "bg-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    label: "Heads up",
  },
  error: {
    stripe: "bg-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    label: "Error",
  },
};

function NotificationIcon(props: { type: ToastType; className: string }) {
  const { type, className } = props;
  if (type === "success") return <CheckCircle2 className={className} />;
  if (type === "info") return <Info className={className} />;
  if (type === "warning") return <AlertTriangle className={className} />;
  return <AlertCircle className={className} />;
}

function NotificationItem(props: {
  toast: Toast;
  onClose: () => void;
  brandColor: string;
  brandLogoUrl: string | null;
}) {
  const { toast, onClose, brandColor, brandLogoUrl } = props;

  useEffect(() => {
    const explicitDuration = toast.duration;
    const fallbackDuration = DEFAULT_DURATION_MS[toast.type];
    const duration = explicitDuration ?? fallbackDuration;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.type, onClose]);

  const accent = ACCENT_BY_TYPE[toast.type];

  return (
    <div
      className="bg-white rounded-lg shadow-2xl overflow-hidden flex max-w-md min-w-[320px] animate-au-notification"
      role="alert"
      aria-live="polite"
    >
      <div className={`${accent.stripe} w-1.5 flex-shrink-0`} />
      <div
        className="flex-shrink-0 flex items-center justify-center px-3"
        style={{ backgroundColor: brandColor }}
      >
        {brandLogoUrl ? (
          <Image
            src={brandLogoUrl}
            alt="AU Rubber"
            width={28}
            height={28}
            className="object-contain"
            unoptimized
          />
        ) : (
          <Image
            src="/au-industries/logo.jpg"
            alt="AU Industries"
            width={28}
            height={28}
            className="object-contain"
          />
        )}
      </div>
      <div className="flex-1 px-4 py-3 flex items-start gap-3 min-w-0">
        <div
          className={`${accent.iconBg} ${accent.iconColor} rounded-full p-1 flex-shrink-0 mt-0.5`}
        >
          <NotificationIcon type={toast.type} className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {accent.label}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-0.5 break-words">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function AuRubberNotificationProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const { branding } = useAuRubberBranding();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let createdUrl: string | null = null;
    if (branding.logoUrl) {
      const proxyUrl = auRubberApiClient.proxyImageUrl(branding.logoUrl);
      const headers = auRubberApiClient.authHeaders();
      fetch(proxyUrl, { headers, signal: controller.signal })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!controller.signal.aborted && blob) {
            createdUrl = URL.createObjectURL(blob);
            setLogoObjectUrl(createdUrl);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setLogoObjectUrl(null);
        });
    } else {
      setLogoObjectUrl(null);
    }
    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [branding.logoUrl]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const docRef = globalThis.document;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {docRef
        ? createPortal(
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-3 pointer-events-none">
              {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                  <NotificationItem
                    toast={toast}
                    onClose={() => hideToast(toast.id)}
                    brandColor={branding.primaryColor}
                    brandLogoUrl={logoObjectUrl}
                  />
                </div>
              ))}
            </div>,
            docRef.body,
          )
        : null}
      <style jsx global>{`
        @keyframes au-notification {
          from {
            transform: translateY(-16px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-au-notification {
          animation: au-notification 0.25s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
