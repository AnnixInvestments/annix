"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CalendarConnection, CalendarProvider } from "@/app/lib/api/annixRepApi";
import { formatRelative } from "@/app/lib/datetime";
import {
  useCalendarConnections,
  useCalendarOAuthUrl,
  useConnectCalendar,
  useDisconnectCalendar,
  useSyncCalendar,
  useSyncConflictCount,
} from "@/app/lib/query/hooks";

interface CalDAVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (caldavUrl: string, credentials: string) => void;
  isConnecting: boolean;
}

function CalDAVModal({ isOpen, onClose, onConnect, isConnecting }: CalDAVModalProps) {
  const [caldavUrl, setCaldavUrl] = useState("https://caldav.icloud.com");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(caldavUrl, `${username}:${password}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Connect Apple Calendar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          To connect your Apple Calendar, you need to create an app-specific password at{" "}
          <a
            href="https://appleid.apple.com/account/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            appleid.apple.com
          </a>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CalDAV URL
            </label>
            <input
              type="url"
              value={caldavUrl}
              onChange={(e) => setCaldavUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="https://caldav.icloud.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Apple ID Email
            </label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="your@icloud.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              App-Specific Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="xxxx-xxxx-xxxx-xxxx"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConnectionCardProps {
  connection: CalendarConnection;
  onDisconnect: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
}

function ConnectionCard({
  connection,
  onDisconnect,
  onSync,
  isSyncing,
  isDisconnecting,
}: ConnectionCardProps) {
  const providerConfig = {
    google: {
      name: "Google Calendar",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z" />
        </svg>
      ),
      bgColor: "bg-red-50 dark:bg-red-900/20",
      iconColor: "text-red-600",
    },
    outlook: {
      name: "Outlook Calendar",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.5 3v18l-9-9 9-9zm1 0v18l9-9-9-9z" />
        </svg>
      ),
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
    },
    apple: {
      name: "Apple Calendar",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
      bgColor: "bg-gray-100 dark:bg-gray-700",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
    caldav: {
      name: "CalDAV Calendar",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      ),
      bgColor: "bg-gray-100 dark:bg-gray-700",
      iconColor: "text-gray-600 dark:text-gray-400",
    },
  };

  const config = providerConfig[connection.provider] ?? providerConfig.caldav;

  const statusConfig = {
    active: {
      label: "Connected",
      className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    },
    paused: {
      label: "Paused",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    },
    error: {
      label: "Error",
      className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    },
    expired: {
      label: "Expired",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
    },
  };

  const status = statusConfig[connection.syncStatus] ?? statusConfig.error;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 ${config.bgColor} rounded-lg`}>
            <span className={config.iconColor}>{config.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{connection.accountEmail}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {connection.lastSyncAt ? (
          <span>Last synced {formatRelative(new Date(connection.lastSyncAt).toISOString())}</span>
        ) : (
          <span>Never synced</span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
        >
          {isDisconnecting ? "..." : "Disconnect"}
        </button>
      </div>
    </div>
  );
}

export default function CalendarsSettingsPage() {
  const { data: connections, isLoading } = useCalendarConnections();
  const { data: conflictCountData } = useSyncConflictCount();
  const oauthUrl = useCalendarOAuthUrl();
  const disconnect = useDisconnectCalendar();
  const sync = useSyncCalendar();
  const connectCalendar = useConnectCalendar();

  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [showCalDAVModal, setShowCalDAVModal] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "CALENDAR_CONNECTED") {
        window.location.reload();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleOAuthConnect = async (provider: CalendarProvider) => {
    const redirectUri = `${window.location.origin}/annix-rep/oauth/callback`;

    const result = await oauthUrl.mutateAsync({ provider, redirectUri });

    const url = new URL(result.url);
    url.searchParams.set("state", provider);

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      url.toString(),
      "calendar_oauth",
      `width=${width},height=${height},left=${left},top=${top}`,
    );
  };

  const handleCalDAVConnect = async (caldavUrl: string, credentials: string) => {
    await connectCalendar.mutateAsync({
      provider: "caldav",
      authCode: credentials,
      caldavUrl,
    });
    setShowCalDAVModal(false);
  };

  const handleSync = async (connectionId: number) => {
    setSyncingId(connectionId);
    await sync.mutateAsync({ connectionId });
    setSyncingId(null);
  };

  const handleDisconnect = async (connectionId: number) => {
    setDisconnectingId(connectionId);
    await disconnect.mutateAsync(connectionId);
    setDisconnectingId(null);
  };

  const connectedProviders = new Set(connections?.map((c) => c.provider) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/annix-rep/settings"
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Connections</h1>
          <p className="text-gray-500 dark:text-gray-400">Connect your calendars to sync events</p>
        </div>
      </div>

      {connections && connections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected Calendars
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onSync={() => handleSync(connection.id)}
                onDisconnect={() => handleDisconnect(connection.id)}
                isSyncing={syncingId === connection.id}
                isDisconnecting={disconnectingId === connection.id}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Calendar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${connectedProviders.has("google") ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Google Calendar
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {connectedProviders.has("google") ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOAuthConnect("google")}
              disabled={connectedProviders.has("google") || oauthUrl.isPending}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {connectedProviders.has("google") ? "Already Connected" : "Connect Google"}
            </button>
          </div>

          <div
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${connectedProviders.has("outlook") ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.5 3v18l-9-9 9-9zm1 0v18l9-9-9-9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Outlook Calendar
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {connectedProviders.has("outlook") ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOAuthConnect("outlook")}
              disabled={connectedProviders.has("outlook") || oauthUrl.isPending}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {connectedProviders.has("outlook") ? "Already Connected" : "Connect Outlook"}
            </button>
          </div>

          <div
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${connectedProviders.has("caldav") || connectedProviders.has("apple") ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Apple Calendar
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {connectedProviders.has("caldav") || connectedProviders.has("apple")
                    ? "Connected"
                    : "Not connected"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCalDAVModal(true)}
              disabled={connectedProviders.has("caldav") || connectedProviders.has("apple")}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectedProviders.has("caldav") || connectedProviders.has("apple")
                ? "Already Connected"
                : "Connect Apple"}
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {connections && connections.length > 0 && (
        <Link href="/fieldflow/settings/calendars/conflicts">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    (conflictCountData?.count ?? 0) > 0
                      ? "bg-amber-50 dark:bg-amber-900/20"
                      : "bg-green-50 dark:bg-green-900/20"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${
                      (conflictCountData?.count ?? 0) > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    {(conflictCountData?.count ?? 0) > 0 ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Sync Conflicts
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(conflictCountData?.count ?? 0) > 0
                      ? `${conflictCountData?.count} conflict${conflictCountData?.count === 1 ? "" : "s"} need attention`
                      : "No conflicts detected"}
                  </p>
                </div>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </Link>
      )}

      <CalDAVModal
        isOpen={showCalDAVModal}
        onClose={() => setShowCalDAVModal(false)}
        onConnect={handleCalDAVConnect}
        isConnecting={connectCalendar.isPending}
      />
    </div>
  );
}
