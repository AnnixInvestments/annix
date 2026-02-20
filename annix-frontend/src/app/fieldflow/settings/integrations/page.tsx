"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  MeetingPlatform,
  MeetingPlatformConnection,
  TeamsBotSessionStatus,
} from "@/app/lib/api/annixRepApi";
import { annixRepApi } from "@/app/lib/api/annixRepApi";
import { formatDateLongZA, formatDateTimeZA } from "@/app/lib/datetime";
import {
  useDisconnectMeetingPlatform,
  useMeetingPlatformConnections,
  usePlatformRecordings,
  useSyncMeetingPlatform,
  useTeamsBotActiveSessions,
  useTeamsBotSessionHistory,
  useUpdateMeetingPlatformConnection,
} from "@/app/lib/query/hooks";

const MEETING_PLATFORMS: Array<{
  id: MeetingPlatform;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: "zoom",
    name: "Zoom",
    description: "Connect to Zoom to automatically fetch meeting recordings",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.585 16.8a.75.75 0 01-.75-.75V7.95a.75.75 0 01.75-.75h10.35c1.035 0 1.875.84 1.875 1.875v5.85c0 1.035-.84 1.875-1.875 1.875H4.585zm12.33-7.5v5.4l2.745 1.83a.375.375 0 00.59-.307V7.777a.375.375 0 00-.59-.307l-2.745 1.83z" />
      </svg>
    ),
    color: "text-blue-500",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Connect to Teams to sync meeting recordings and transcripts",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 6.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12 12a3 3 0 100-6 3 3 0 000 6zm6.75 1.5a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-4.5a.75.75 0 00-.75-.75h-3zM1.5 14.25a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-4.5zm6-1.5a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h9a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-9z" />
      </svg>
    ),
    color: "text-purple-500",
  },
  {
    id: "google_meet",
    name: "Google Meet",
    description: "Connect to Google Meet to sync recordings from Google Drive",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    color: "text-green-500",
  },
];

function ConnectionStatusBadge({ connection }: { connection: MeetingPlatformConnection }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-400",
      label: "Connected",
    },
    error: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-400",
      label: "Error",
    },
    disconnected: {
      bg: "bg-gray-100 dark:bg-slate-700",
      text: "text-gray-600 dark:text-gray-400",
      label: "Disconnected",
    },
    token_expired: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-400",
      label: "Token Expired",
    },
  };

  const config = statusConfig[connection.connectionStatus] ?? statusConfig.disconnected;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ConnectionCard({
  connection,
  onUpdate,
}: {
  connection: MeetingPlatformConnection;
  onUpdate: () => void;
}) {
  const { data: recordings } = usePlatformRecordings(connection.id, 5);
  const syncPlatform = useSyncMeetingPlatform();
  const disconnectPlatform = useDisconnectMeetingPlatform();
  const updateConnection = useUpdateMeetingPlatformConnection();
  const [showSettings, setShowSettings] = useState(false);

  const platformInfo = MEETING_PLATFORMS.find((p) => p.id === connection.platform);

  const handleSync = async () => {
    await syncPlatform.mutateAsync({ id: connection.id, daysBack: 7 });
  };

  const handleDisconnect = async () => {
    if (
      confirm(
        `Are you sure you want to disconnect "${platformInfo?.name ?? connection.platform}"? This will revoke access.`,
      )
    ) {
      await disconnectPlatform.mutateAsync(connection.id);
      onUpdate();
    }
  };

  const handleToggleSetting = async (
    setting: "autoFetchRecordings" | "autoTranscribe" | "autoSendSummary",
  ) => {
    await updateConnection.mutateAsync({
      id: connection.id,
      dto: { [setting]: !connection[setting] },
    });
  };

  const recordingStats = recordings
    ? {
        total: recordings.length,
        completed: recordings.filter((r) => r.recordingStatus === "completed").length,
        pending: recordings.filter((r) =>
          ["pending", "downloading", "processing"].includes(r.recordingStatus),
        ).length,
      }
    : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {platformInfo && <div className={platformInfo.color}>{platformInfo.icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {platformInfo?.name ?? connection.platform}
              </h3>
              <ConnectionStatusBadge connection={connection} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {connection.accountEmail}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
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
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {recordingStats && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {recordingStats.total}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Recordings</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {recordingStats.completed}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Processed</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {recordingStats.pending}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
          </div>
        </div>
      )}

      {connection.lastRecordingSyncAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Last synced: {formatDateLongZA(new Date(connection.lastRecordingSyncAt))}
          {connection.lastError && (
            <span className="text-red-500 ml-2">Error: {connection.lastError}</span>
          )}
        </p>
      )}

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Automation Settings
          </h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={connection.autoFetchRecordings}
              onChange={() => handleToggleSetting("autoFetchRecordings")}
              disabled={updateConnection.isPending}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-fetch recordings after meetings
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={connection.autoTranscribe}
              onChange={() => handleToggleSetting("autoTranscribe")}
              disabled={updateConnection.isPending}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-transcribe recordings
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={connection.autoSendSummary}
              onChange={() => handleToggleSetting("autoSendSummary")}
              disabled={updateConnection.isPending}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-email meeting summaries
            </span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSync}
          disabled={syncPlatform.isPending}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {syncPlatform.isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Sync Now
            </>
          )}
        </button>
        <Link
          href={`/fieldflow/settings/integrations/${connection.id}/recordings`}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          View Recordings
        </Link>
        <button
          onClick={handleDisconnect}
          disabled={disconnectPlatform.isPending}
          className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
        >
          {disconnectPlatform.isPending ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
    </div>
  );
}

function PlatformConnectCard({
  platform,
  existingConnection,
  onConnected,
}: {
  platform: (typeof MEETING_PLATFORMS)[number];
  existingConnection: MeetingPlatformConnection | undefined;
  onConnected: () => void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "PLATFORM_CONNECTED" && event.data?.platform === platform.id) {
        setIsConnecting(false);
        onConnected();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [platform.id, onConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/fieldflow/settings/integrations/callback`;
      const { url } = await annixRepApi.meetingPlatforms.oauthUrl(platform.id, redirectUri);

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        `oauth_${platform.id}`,
        `width=${width},height=${height},left=${left},top=${top},popup=yes`,
      );

      if (!popup) {
        setIsConnecting(false);
        alert("Popup blocked. Please allow popups for this site.");
        return;
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
        }
      }, 1000);
    } catch (error) {
      setIsConnecting(false);
      console.error("Failed to get OAuth URL:", error);
    }
  };

  if (existingConnection?.connectionStatus === "active") {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={platform.color}>{platform.icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{platform.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{platform.description}</p>
        </div>
      </div>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        {isConnecting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            Connect
          </>
        )}
      </button>
    </div>
  );
}

const botStatusLabels: Record<TeamsBotSessionStatus, { label: string; color: string }> = {
  joining: {
    label: "Joining",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  leaving: {
    label: "Leaving",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  ended: {
    label: "Ended",
    color: "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300",
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function IntegrationsSettingsPage() {
  const { data: connections, isLoading, refetch } = useMeetingPlatformConnections();
  const { data: activeBotSessions } = useTeamsBotActiveSessions();
  const { data: botSessionHistory } = useTeamsBotSessionHistory(5);

  const activeConnections = connections?.filter((c) => c.connectionStatus === "active");
  const connectionByPlatform = (platform: MeetingPlatform) =>
    connections?.find((c) => c.platform === platform);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow/settings"
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meeting Platform Integrations
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your video meeting platforms to automatically fetch recordings and generate
            transcripts
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">How it works</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              After connecting a platform, FieldFlow will automatically detect meetings from your
              calendar and fetch recordings when they become available. Recordings are then
              transcribed, speaker-labeled, and summarized. You can configure automatic email
              summaries to be sent after each meeting.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connect a Platform</h2>
        <div className="grid gap-4">
          {MEETING_PLATFORMS.map((platform) => (
            <PlatformConnectCard
              key={platform.id}
              platform={platform}
              existingConnection={connectionByPlatform(platform.id)}
              onConnected={() => refetch()}
            />
          ))}
        </div>
      </div>

      {activeConnections && activeConnections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected Platforms
          </h2>
          <div className="space-y-4">
            {activeConnections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onUpdate={() => refetch()}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Bot Sessions</h2>
          {activeBotSessions && activeBotSessions.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
              {activeBotSessions.length} active
            </span>
          )}
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300">
                AI Bot Transcription
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                The AI Bot can join your Microsoft Teams meetings to transcribe conversations in
                real-time. Start a session from any meeting detail page by clicking "Join with AI
                Bot".
              </p>
            </div>
          </div>
        </div>

        {activeBotSessions && activeBotSessions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Sessions
            </h3>
            <div className="space-y-2">
              {activeBotSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/fieldflow/meetings/${session.meetingId}/transcript`}
                  className="block bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Meeting #{session.meetingId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {session.participantCount} participants
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${botStatusLabels[session.status].color}`}
                    >
                      {botStatusLabels[session.status].label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {botSessionHistory && botSessionHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Sessions
            </h3>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
              {botSessionHistory.map((session) => (
                <div key={session.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Meeting #{session.meetingId ?? "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {session.startedAt
                          ? formatDateTimeZA(new Date(session.startedAt))
                          : "Not started"}
                        {" - "}
                        {session.transcriptEntryCount} entries
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${botStatusLabels[session.status].color}`}
                  >
                    {botStatusLabels[session.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!activeBotSessions || activeBotSessions.length === 0) &&
          (!botSessionHistory || botSessionHistory.length === 0) && (
            <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No AI bot sessions yet. Start a session from a meeting detail page.
              </p>
            </div>
          )}
      </div>

      {isLoading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading integrations...
        </div>
      )}
    </div>
  );
}
