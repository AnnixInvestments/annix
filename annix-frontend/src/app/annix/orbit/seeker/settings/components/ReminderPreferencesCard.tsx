"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  useOrbitReminderPreferences,
  useOrbitUpdateReminderPreferences,
} from "@/app/lib/query/hooks";

export function ReminderPreferencesCard() {
  const { showToast } = useToast();
  const prefsQuery = useOrbitReminderPreferences();
  const updatePrefs = useOrbitUpdateReminderPreferences();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);

  const data = prefsQuery.data;
  const multiChannel = data ? data.multiChannelReminders : false;

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!data) return;
    hydratedRef.current = true;
    setPhone(data.phone ? data.phone : "");
    setEmail(data.interviewReminderEmail);
    setSms(data.interviewReminderSms);
    setWhatsapp(data.interviewReminderWhatsapp);
  }, [data]);

  const handleSave = () => {
    const trimmedPhone = phone.trim();
    updatePrefs.mutate(
      {
        phone: trimmedPhone.length > 0 ? trimmedPhone : null,
        interviewReminderEmail: email,
        interviewReminderSms: multiChannel ? sms : false,
        interviewReminderWhatsapp: multiChannel ? whatsapp : false,
      },
      {
        onSuccess: () => showToast("Reminder settings saved", "success"),
        onError: () => showToast("Couldn't save reminder settings — please try again", "error"),
      },
    );
  };

  const saving = updatePrefs.isPending;
  const channelDisabled = !multiChannel;

  return (
    <div className="bg-white rounded-xl border border-[var(--brand-navbar-100,#e0e0f5)] p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Interview reminders</h2>
        <p className="text-sm text-gray-600 mt-1">
          We'll remind you about upcoming interviews a day before and an hour before.
        </p>
      </div>

      {prefsQuery.isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--brand-navbar,#323288)]" />
        </div>
      ) : (
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-900">Email reminders</span>
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
              className="h-4 w-4 text-[var(--brand-navbar,#323288)]"
            />
          </label>

          <div>
            <label htmlFor="reminder-phone" className="block text-sm font-medium text-gray-900">
              Mobile number
            </label>
            <input
              id="reminder-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 ..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Used for SMS and WhatsApp reminders.</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-gray-900">SMS reminders</span>
              <input
                type="checkbox"
                checked={sms && multiChannel}
                disabled={channelDisabled}
                onChange={(e) => setSms(e.target.checked)}
                className="h-4 w-4 text-[var(--brand-navbar,#323288)] disabled:opacity-50"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-gray-900">WhatsApp reminders</span>
              <input
                type="checkbox"
                checked={whatsapp && multiChannel}
                disabled={channelDisabled}
                onChange={(e) => setWhatsapp(e.target.checked)}
                className="h-4 w-4 text-[var(--brand-navbar,#323288)] disabled:opacity-50"
              />
            </label>
            {channelDisabled ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                SMS and WhatsApp reminders are available on our top plan. Upgrade to switch them on.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save reminder settings"}
          </button>
        </div>
      )}
    </div>
  );
}
