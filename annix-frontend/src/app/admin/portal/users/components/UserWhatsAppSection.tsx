"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { RbacUserWithAccessSummary } from "@/app/lib/api/adminApi";
import { formatDateTimeZA } from "@/app/lib/datetime";
import { useUpdateUserWhatsApp } from "@/app/lib/query/hooks";

interface UserWhatsAppSectionProps {
  user: RbacUserWithAccessSummary;
}

export function UserWhatsAppSection(props: UserWhatsAppSectionProps) {
  const user = props.user;
  const { showToast } = useToast();
  const updateMutation = useUpdateUserWhatsApp();

  const currentPhone = user.whatsappPhone;
  const currentOptIn = user.whatsappOptIn;
  const currentOptInAt = user.whatsappOptInAt;
  const initialPhone = currentPhone ?? "";
  const initialOptIn = currentOptIn ?? false;
  const optInAt = currentOptInAt ?? null;

  const [phone, setPhone] = useState(initialPhone);
  const [optIn, setOptIn] = useState(initialOptIn);

  useEffect(() => {
    const nextPhone = user.whatsappPhone;
    const nextOptIn = user.whatsappOptIn;
    setPhone(nextPhone ?? "");
    setOptIn(nextOptIn ?? false);
  }, [user.whatsappPhone, user.whatsappOptIn]);

  const trimmedPhone = phone.trim();
  const dirty = trimmedPhone !== initialPhone.trim() || optIn !== initialOptIn;
  const isSaving = updateMutation.isPending;

  const handleSave = () => {
    updateMutation.mutate(
      {
        userId: user.id,
        payload: {
          whatsappPhone: trimmedPhone.length > 0 ? trimmedPhone : null,
          whatsappOptIn: optIn,
        },
      },
      {
        onSuccess: () => showToast("WhatsApp settings saved", "success"),
        onError: (err) => showToast(`Error: ${err.message}`, "error"),
      },
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">WhatsApp</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Number and consent for broadcast messaging.
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label
            htmlFor={`whatsapp-phone-${user.id}`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            WhatsApp number
          </label>
          <input
            id={`whatsapp-phone-${user.id}`}
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="082 039 8429"
            className="w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            SA numbers auto-convert, e.g. 082… → 27…
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
          />
          <span>
            <span className="font-medium">User consents to WhatsApp messages (POPIA)</span>
            {optInAt && (
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Consent recorded {formatDateTimeZA(optInAt)}
              </span>
            )}
          </span>
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className="px-4 py-2 rounded-lg bg-[var(--brand-navbar,#323288)] text-white text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
