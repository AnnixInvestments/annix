"use client";

import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import { useOrbitCalendarFeed } from "@/app/lib/query/hooks";
import { API_BASE_URL } from "@/lib/api-config";

function absoluteApiBase(): string {
  const base = API_BASE_URL;
  const isAbsolute = base.startsWith("http://") || base.startsWith("https://");
  if (isAbsolute) return base;
  const location = globalThis.location;
  return location ? `${location.origin}${base}` : base;
}

export function CalendarSyncButton() {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const feedQuery = useOrbitCalendarFeed(open);

  const feedData = feedQuery.data;
  const token = feedData ? feedData.token : null;
  const feedUrl = token ? `${absoluteApiBase()}/public/annix-orbit/calendar/${token}.ics` : null;
  const webcalUrl = feedUrl ? feedUrl.replace(/^https?:\/\//, "webcal://") : null;

  const googleUrl = webcalUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    : null;
  const outlookUrl = feedUrl
    ? `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent("Annix Orbit interviews")}`
    : null;

  const handleCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      showToast("Feed URL copied", "success");
    } catch {
      showToast("Couldn't copy — select the URL and copy it manually.", "error");
    }
  };

  const linkClass =
    "px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50";
  const feedLoading = feedQuery.isLoading;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--brand-navbar-100,#e0e0f5)] bg-white text-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-50,#f0f0fc)]"
      >
        Sync to calendar
      </button>

      {open ? (
        <FormModal
          isOpen={true}
          onClose={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
          title="Sync interviews to your calendar"
          hideFooter
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Subscribe once and every interview — including new ones — stays in sync with your
              calendar automatically.
            </p>

            {feedLoading || !feedUrl ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--brand-navbar,#323288)]" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {webcalUrl ? (
                    <a href={webcalUrl} className={linkClass}>
                      Apple Calendar
                    </a>
                  ) : null}
                  {googleUrl ? (
                    <a
                      href={googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      Google
                    </a>
                  ) : null}
                  {outlookUrl ? (
                    <a
                      href={outlookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      Outlook
                    </a>
                  ) : null}
                </div>

                <div>
                  <span className="text-xs text-gray-500">Or add this feed URL manually:</span>
                  <div className="mt-1 flex gap-2">
                    <input
                      readOnly
                      value={feedUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Keep this link private — anyone with it can see your interview times.
                </p>
              </>
            )}
          </div>
        </FormModal>
      ) : null}
    </>
  );
}
