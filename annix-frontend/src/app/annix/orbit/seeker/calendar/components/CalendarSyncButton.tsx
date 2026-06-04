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

  const isLocalFeed = feedUrl ? /\/\/(localhost|127\.0\.0\.1)/.test(feedUrl) : false;

  const handleCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      showToast("Feed URL copied", "success");
    } catch {
      showToast("Couldn't copy — select the URL and copy it manually.", "error");
    }
  };

  const handleDownload = async () => {
    if (!feedUrl) return;
    try {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`Feed responded ${response.status}`);
      }
      const text = await response.text();
      const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "annix-orbit-interviews.ics";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      showToast(
        "Calendar file downloaded — import it via your calendar's 'Add from file'.",
        "success",
      );
    } catch {
      showToast("Couldn't download the calendar file. Please try again.", "error");
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
              Add your interviews to your calendar — download a file to import now, or subscribe
              live so new interviews appear automatically.
            </p>

            {feedLoading || !feedUrl ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--brand-navbar,#323288)]" />
              </div>
            ) : (
              <>
                <div>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
                  >
                    Download .ics file
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Works everywhere — import it via your calendar app's “Add from file”.
                  </p>
                </div>

                <div>
                  <span className="text-xs text-gray-500">
                    Or subscribe live (stays in sync as new interviews are added):
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
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
                </div>

                {isLocalFeed ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    You're on a local address, so the live “subscribe” links won't work — calendar
                    services can't reach <code>localhost</code>. Use <strong>Download .ics</strong>{" "}
                    here. Live subscribe works on the published site.
                  </div>
                ) : null}

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
