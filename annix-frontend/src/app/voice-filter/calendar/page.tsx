"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useVoiceFilterAuth } from "@/app/context/VoiceFilterAuthContext";
import { VoiceFilterCalendarProvider, voiceFilterApi } from "@/app/lib/api/voiceFilterApi";
import { formatRelative } from "@/app/lib/datetime";

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

interface ProviderCardProps {
  provider: VoiceFilterCalendarProvider;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
}

function ProviderCard({
  provider,
  onConnect,
  onDisconnect,
  onSync,
  isSyncing,
  isDisconnecting,
}: ProviderCardProps) {
  const providerConfig: Record<string, { name: string; emoji: string; color: string }> = {
    google: { name: "Google Calendar", emoji: "📅", color: "#ea4335" },
    microsoft: { name: "Microsoft Outlook", emoji: "📧", color: "#0078d4" },
    outlook: { name: "Microsoft Outlook", emoji: "📧", color: "#0078d4" },
  };

  const config = providerConfig[provider.provider] ?? {
    name: provider.provider,
    emoji: "📆",
    color: "#555",
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: "Connected", color: "#00ba7c" },
    syncing: { label: "Syncing", color: "#1d9bf0" },
    error: { label: "Error", color: "#f4212e" },
    disconnected: { label: "Not connected", color: "#71767b" },
  };

  const status = statusConfig[provider.status] ?? statusConfig.disconnected;

  if (provider.connected) {
    return (
      <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${config.color}15` }}
            >
              {config.emoji}
            </div>
            <div>
              <h3 className="font-semibold text-white">{config.name}</h3>
              <p className="text-sm text-[#71767b]">
                {provider.lastSync
                  ? `Last synced ${formatRelative(provider.lastSync)}`
                  : "Never synced"}
              </p>
            </div>
          </div>
          <span
            className="px-2.5 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            {status.label}
          </span>
        </div>

        {provider.error && (
          <div className="text-sm text-[#f4212e] bg-[#f4212e]/10 rounded-lg px-3 py-2 mb-4">
            {provider.error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex-1 px-4 py-2 text-sm font-medium text-[#1d9bf0] bg-[#1d9bf0]/10 rounded-full hover:bg-[#1d9bf0]/20 disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="px-4 py-2 text-sm font-medium text-[#f4212e] bg-[#f4212e]/10 rounded-full hover:bg-[#f4212e]/20 disabled:opacity-50"
          >
            {isDisconnecting ? "..." : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ backgroundColor: `${config.color}15` }}
      >
        {config.emoji}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold mb-1">{config.name}</h3>
        <p className="text-sm text-[#71767b]">Not connected</p>
      </div>
      <button
        onClick={onConnect}
        className="px-5 py-2.5 bg-[#1d9bf0] text-white text-sm font-semibold rounded-full hover:bg-[#1a8cd8] transition-colors"
      >
        Connect
      </button>
    </div>
  );
}

export default function VoiceFilterCalendarPage() {
  const { isAuthenticated, isLoading: authLoading } = useVoiceFilterAuth();

  const [providers, setProviders] = useState<VoiceFilterCalendarProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const result = await voiceFilterApi.calendarProviders();
      setProviders(result.providers);
    } catch {
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Calendar Connections - Voice Filter";

    if (isAuthenticated) {
      loadProviders();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, loadProviders]);

  const handleConnect = (provider: string) => {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${voiceFilterApi.calendarOauthUrl(provider)}?returnUrl=${returnUrl}`;
  };

  const handleSync = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      await voiceFilterApi.calendarSync(provider);
      await loadProviders();
    } catch (err) {
      console.error("Failed to sync calendar:", err);
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setDisconnectingProvider(provider);
    try {
      await voiceFilterApi.calendarDisconnect(provider);
      await loadProviders();
    } catch (err) {
      console.error("Failed to disconnect calendar:", err);
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const defaultProviders: VoiceFilterCalendarProvider[] = [
    { provider: "google", connected: false, lastSync: null, status: "disconnected", error: null },
    {
      provider: "microsoft",
      connected: false,
      lastSync: null,
      status: "disconnected",
      error: null,
    },
  ];

  const displayProviders =
    providers.length > 0
      ? providers
      : defaultProviders.map((dp) => {
          const existing = providers.find((p) => p.provider === dp.provider);
          return existing ?? dp;
        });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d9bf0]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1419] text-[#e7e9ea]">
        <header className="bg-gradient-to-r from-[#1a1f26] to-[#141a21] border-b border-[#2f3336] px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/voice-filter"
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#71767b] hover:text-white"
              >
                <BackIcon />
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Calendar Connections</h1>
                <p className="text-sm text-[#71767b]">Connect your calendars to sync events</p>
              </div>
            </div>
            <ThemeToggle
              className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-md hover:bg-white/15 transition-colors"
              iconClassName="w-4 h-4 text-white"
            />
          </div>
        </header>

        <div className="max-w-lg mx-auto px-6 py-16">
          <div className="bg-[#16181c] border border-[#2f3336] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[#1d9bf0]/15 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🔐
            </div>
            <h2 className="text-xl font-semibold mb-3">Sign in Required</h2>
            <p className="text-[#71767b] mb-6">
              To connect and sync your calendars, please sign in first.
            </p>
            <Link
              href="/voice-filter/login?redirect=/voice-filter/calendar"
              className="inline-block px-6 py-3 bg-[#1d9bf0] text-white font-semibold rounded-full hover:bg-[#1a8cd8] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e7e9ea]">
      <header className="bg-gradient-to-r from-[#1a1f26] to-[#141a21] border-b border-[#2f3336] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/voice-filter"
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#71767b] hover:text-white"
            >
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Calendar Connections</h1>
              <p className="text-sm text-[#71767b]">Connect your calendars to sync events</p>
            </div>
          </div>
          <ThemeToggle
            className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-md hover:bg-white/15 transition-colors"
            iconClassName="w-4 h-4 text-white"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#71767b] uppercase tracking-wide mb-4">
            Calendar Providers
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d9bf0]" />
            </div>
          ) : (
            <div className="space-y-3">
              {displayProviders.map((provider) => (
                <ProviderCard
                  key={provider.provider}
                  provider={provider}
                  onConnect={() => handleConnect(provider.provider)}
                  onSync={() => handleSync(provider.provider)}
                  onDisconnect={() => handleDisconnect(provider.provider)}
                  isSyncing={syncingProvider === provider.provider}
                  isDisconnecting={disconnectingProvider === provider.provider}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#16181c] border border-[#2f3336] rounded-xl p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>ℹ️</span> Why connect your calendar?
          </h3>
          <ul className="space-y-2 text-sm text-[#71767b]">
            <li className="flex items-start gap-2">
              <span className="text-[#00ba7c]">✓</span>
              <span>See upcoming meetings on the Voice Filter home screen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00ba7c]">✓</span>
              <span>Quickly join meetings with one click</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00ba7c]">✓</span>
              <span>Auto-detect meeting links from calendar events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00ba7c]">✓</span>
              <span>Get reminders before meetings start</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
