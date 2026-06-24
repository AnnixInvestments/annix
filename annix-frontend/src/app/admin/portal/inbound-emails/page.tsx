"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { fromISO } from "@/app/lib/datetime";
import {
  useInboundEmailConfigs,
  usePollInboundEmails,
  useSetInboundEmailEnabled,
} from "@/app/lib/query/hooks";

function rowKey(companyId: number | null): string {
  return companyId === null ? "shared" : String(companyId);
}

function StatusPill(props: { enabled: boolean }) {
  const enabled = props.enabled;
  const classes = enabled
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export default function AdminInboundEmailsPage() {
  const searchParams = useSearchParams();
  const targetApp = searchParams.get("app");
  const targetCompany = searchParams.get("companyId");

  const configsQuery = useInboundEmailConfigs();
  const setEnabled = useSetInboundEmailEnabled();
  const pollNow = usePollInboundEmails();

  const configData = configsQuery.data;
  const groups = useMemo(() => configData ?? [], [configData]);

  useEffect(() => {
    if (!targetApp || !targetCompany) return;
    const elementId = `inbox-row-${targetApp}-${targetCompany}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [targetApp, targetCompany, groups]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Inbox Emails</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Per-company inbound mailboxes for each app. New customer mailboxes are created disabled
            — create the mailbox on the hosting panel, then enable it here.
          </p>
        </div>
        <button
          type="button"
          disabled={pollNow.isPending}
          onClick={() => pollNow.mutate()}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          title="Fetch new mail from all enabled mailboxes now instead of waiting for the 6-hour poll"
        >
          {pollNow.isPending ? "Polling…" : "Poll now"}
        </button>
      </div>
      {pollNow.isSuccess && (
        <p className="-mt-4 text-sm text-green-600 dark:text-green-400">
          Poll triggered — new mail is being processed. Refresh in a moment to see updated activity.
        </p>
      )}
      {pollNow.isError && (
        <p className="-mt-4 text-sm text-red-600 dark:text-red-400">
          Could not trigger the poll — please try again.
        </p>
      )}

      {configsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : configsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 text-sm text-red-700 dark:text-red-300">
          Something went wrong loading inbox configurations — please try again.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const app = group.app;
            const accounts = group.accounts;
            return (
              <div
                key={app}
                id={`inbox-card-${app}`}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-transparent overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{group.label}</h2>
                  <span className="text-xs text-gray-400">
                    {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
                  </span>
                </div>

                {accounts.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No mailboxes configured for this app yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                          <th className="px-6 py-3 font-medium">Company</th>
                          <th className="px-6 py-3 font-medium">Email address</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium">Last poll</th>
                          <th className="px-6 py-3 font-medium">Last error</th>
                          <th className="px-6 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((row) => {
                          const companyId = row.companyId;
                          const enabled = row.enabled;
                          const lastPoll = row.lastPollAt;
                          const lastError = row.lastError;
                          const key = rowKey(companyId);
                          const relativePoll = lastPoll ? fromISO(lastPoll).toRelative() : null;
                          const pollDisplay = relativePoll || "Never";
                          const errorDisplay = lastError || "—";
                          const isHighlighted = app === targetApp && key === targetCompany;
                          const isPending =
                            setEnabled.isPending &&
                            setEnabled.variables?.app === app &&
                            setEnabled.variables?.companyId === companyId;
                          const rowClasses = isHighlighted
                            ? "bg-amber-50 dark:bg-amber-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/40";
                          return (
                            <tr
                              key={key}
                              id={`inbox-row-${app}-${key}`}
                              className={`border-b border-gray-50 dark:border-slate-700/50 ${rowClasses}`}
                            >
                              <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                                {row.companyName}
                              </td>
                              <td className="px-6 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                                {row.emailUser}
                              </td>
                              <td className="px-6 py-3">
                                <StatusPill enabled={enabled} />
                              </td>
                              <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                                {pollDisplay}
                              </td>
                              <td className="px-6 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                {errorDisplay}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    setEnabled.mutate({ app, companyId, enabled: !enabled })
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                    enabled
                                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200"
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                                >
                                  {isPending ? "Saving…" : enabled ? "Disable" : "Enable"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
