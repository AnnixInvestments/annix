"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  CreateCrmConfigDto,
  CrmConfig,
  CrmProvider,
  CrmType,
  WebhookConfig,
} from "@/app/lib/api/annixRepApi";
import { annixRepApi } from "@/app/lib/api/annixRepApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import {
  useCreateCrmConfig,
  useCrmConfigs,
  useCrmDisconnect,
  useCrmSyncStatus,
  useDeleteCrmConfig,
  useExportMeetingsCsv,
  useExportProspectsCsv,
  usePullAll,
  useSyncAllProspectsToCrm,
  useSyncNow,
  useTestCrmConnection,
  useUpdateCrmConfig,
} from "@/app/lib/query/hooks";

const CRM_PROVIDERS: Array<{
  id: CrmProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Connect to Salesforce CRM to sync contacts and activities",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10.03 5.32c.78-.83 1.86-1.35 3.06-1.35 1.65 0 3.08.94 3.79 2.31.62-.26 1.29-.4 2-.4 2.76 0 5 2.24 5 5s-2.24 5-5 5c-.34 0-.68-.04-1-.1-.6 1.21-1.84 2.05-3.28 2.05-.46 0-.9-.08-1.31-.23-.63 1.55-2.14 2.65-3.91 2.65-1.49 0-2.81-.78-3.55-1.96-.31.06-.63.09-.95.09-2.76 0-5-2.24-5-5 0-1.99 1.17-3.71 2.86-4.5-.29-.57-.46-1.22-.46-1.91 0-2.35 1.9-4.25 4.25-4.25 1.4 0 2.63.68 3.41 1.73z" />
      </svg>
    ),
    color: "text-blue-500",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Connect to HubSpot CRM to sync contacts and meetings",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.164 7.93V5.307a2.39 2.39 0 0 0 1.386-2.164 2.405 2.405 0 0 0-2.405-2.405 2.405 2.405 0 0 0-2.405 2.405c0 .97.58 1.803 1.41 2.178v2.61a5.41 5.41 0 0 0-2.41 1.152l-6.373-4.96a2.725 2.725 0 0 0 .073-.588 2.73 2.73 0 1 0-2.73 2.73c.51 0 .984-.142 1.39-.387l6.258 4.87a5.4 5.4 0 0 0-.617 2.515 5.41 5.41 0 0 0 .617 2.515l-6.258 4.87c-.406-.245-.88-.387-1.39-.387a2.73 2.73 0 1 0 2.73 2.73c0-.207-.03-.407-.073-.601l6.373-4.946a5.41 5.41 0 0 0 2.41 1.137v2.624a2.405 2.405 0 0 0-1.41 2.178 2.405 2.405 0 1 0 4.81 0 2.39 2.39 0 0 0-1.386-2.165V16.58a5.43 5.43 0 0 0 3.32-5.002 5.43 5.43 0 0 0-3.32-5.002v-.646z" />
      </svg>
    ),
    color: "text-orange-500",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Connect to Pipedrive CRM to sync contacts and deals",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
      </svg>
    ),
    color: "text-green-500",
  },
];

function ConnectionStatusBadge({ config }: { config: CrmConfig }) {
  const isOAuthProvider = ["salesforce", "hubspot", "pipedrive"].includes(config.crmType);

  if (!isOAuthProvider) {
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded-full ${
          config.isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
        }`}
      >
        {config.isActive ? "Active" : "Inactive"}
      </span>
    );
  }

  if (!config.isConnected) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400">
        Not Connected
      </span>
    );
  }

  const tokenExpired = config.tokenExpiresAt && new Date(config.tokenExpiresAt) < new Date();

  if (tokenExpired) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Token Expired
      </span>
    );
  }

  if (config.lastSyncError) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Sync Error
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      Connected
    </span>
  );
}

function CrmConfigCard({
  config,
  onEdit,
  onDelete,
}: {
  config: CrmConfig;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: status } = useCrmSyncStatus(config.id);
  const testConnection = useTestCrmConnection();
  const syncAll = useSyncAllProspectsToCrm();
  const syncNow = useSyncNow();
  const pullAll = usePullAll();
  const disconnect = useCrmDisconnect();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isOAuthProvider = ["salesforce", "hubspot", "pipedrive"].includes(config.crmType);

  const handleTest = async () => {
    setTestResult(null);
    const result = await testConnection.mutateAsync(config.id);
    setTestResult(result);
  };

  const handleSync = async () => {
    await syncAll.mutateAsync(config.id);
  };

  const handleSyncNow = async () => {
    await syncNow.mutateAsync(config.id);
  };

  const handlePullAll = async () => {
    await pullAll.mutateAsync(config.id);
  };

  const handleDisconnect = async () => {
    if (
      confirm(
        `Are you sure you want to disconnect "${config.name}"? This will revoke the OAuth tokens.`,
      )
    ) {
      await disconnect.mutateAsync(config.id);
    }
  };

  const crmTypeLabels: Record<CrmType, string> = {
    webhook: "Webhook",
    csv_export: "CSV Export",
    salesforce: "Salesforce",
    hubspot: "HubSpot",
    pipedrive: "Pipedrive",
    custom: "Custom",
  };

  const providerInfo = CRM_PROVIDERS.find((p) => p.id === config.crmType);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {providerInfo && <div className={`${providerInfo.color}`}>{providerInfo.icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.name}</h3>
              <ConnectionStatusBadge config={config} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {crmTypeLabels[config.crmType]}
              {config.webhookConfig?.url && (
                <span className="ml-2 text-gray-400">
                  {config.webhookConfig.url.substring(0, 50)}
                  {config.webhookConfig.url.length > 50 ? "..." : ""}
                </span>
              )}
              {isOAuthProvider && config.crmUserId && (
                <span className="ml-2 text-gray-400">User: {config.crmUserId}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
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
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
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
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {status.prospectsSynced}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Prospects Synced</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {status.meetingsSynced}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Meetings Synced</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {status.pendingSync}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {status.failedSync}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
          </div>
        </div>
      )}

      {config.lastSyncAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Last synced: {formatDateLongZA(new Date(config.lastSyncAt))}
          {config.lastSyncError && (
            <span className="text-red-500 ml-2">Error: {config.lastSyncError}</span>
          )}
        </p>
      )}

      {isOAuthProvider && config.tokenExpiresAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Token expires: {formatDateLongZA(new Date(config.tokenExpiresAt))}
        </p>
      )}

      {testResult && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            testResult.success
              ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {testResult.message}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleTest}
          disabled={testConnection.isPending}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {testConnection.isPending ? "Testing..." : "Test Connection"}
        </button>

        {config.crmType === "webhook" && (
          <button
            onClick={handleSync}
            disabled={syncAll.isPending}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {syncAll.isPending ? "Syncing..." : "Sync All Prospects"}
          </button>
        )}

        {isOAuthProvider && config.isConnected && (
          <>
            <button
              onClick={handleSyncNow}
              disabled={syncNow.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {syncNow.isPending ? "Syncing..." : "Sync Now"}
            </button>
            <button
              onClick={handlePullAll}
              disabled={pullAll.isPending}
              className="px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
            >
              {pullAll.isPending ? "Pulling..." : "Pull All Contacts"}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
            >
              {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
            </button>
          </>
        )}

        <Link
          href={`/annix-rep/settings/crm/${config.id}/sync-logs`}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          View Sync Logs
        </Link>
      </div>
    </div>
  );
}

function OAuthProviderCard({
  provider,
  existingConfig,
  onConnected,
}: {
  provider: (typeof CRM_PROVIDERS)[number];
  existingConfig: CrmConfig | undefined;
  onConnected: () => void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "CRM_CONNECTED" && event.data?.provider === provider.id) {
        setIsConnecting(false);
        onConnected();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [provider.id, onConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/annix-rep/settings/crm/callback`;
      const { url } = await annixRepApi.crm.oauthUrl(provider.id, redirectUri);

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        `oauth_${provider.id}`,
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

  if (existingConfig?.isConnected) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`${provider.color}`}>{provider.icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{provider.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{provider.description}</p>
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

function CreateConfigModal({
  onClose,
  editConfig,
}: {
  onClose: () => void;
  editConfig: CrmConfig | null;
}) {
  const createConfig = useCreateCrmConfig();
  const updateConfig = useUpdateCrmConfig();

  const [formData, setFormData] = useState<{
    name: string;
    crmType: CrmType;
    webhookUrl: string;
    webhookMethod: "POST" | "PUT" | "PATCH";
    webhookHeaders: string;
    syncProspects: boolean;
    syncMeetings: boolean;
    syncOnCreate: boolean;
    syncOnUpdate: boolean;
    isActive: boolean;
  }>({
    name: editConfig?.name ?? "",
    crmType: editConfig?.crmType ?? "webhook",
    webhookUrl: editConfig?.webhookConfig?.url ?? "",
    webhookMethod: editConfig?.webhookConfig?.method ?? "POST",
    webhookHeaders: editConfig?.webhookConfig?.headers
      ? JSON.stringify(editConfig.webhookConfig.headers, null, 2)
      : "{}",
    syncProspects: editConfig?.syncProspects ?? true,
    syncMeetings: editConfig?.syncMeetings ?? true,
    syncOnCreate: editConfig?.syncOnCreate ?? true,
    syncOnUpdate: editConfig?.syncOnUpdate ?? true,
    isActive: editConfig?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const webhookConfig: WebhookConfig | undefined =
      formData.crmType === "webhook"
        ? {
            url: formData.webhookUrl,
            method: formData.webhookMethod,
            headers: JSON.parse(formData.webhookHeaders || "{}"),
            authType: "none",
          }
        : undefined;

    const dto: CreateCrmConfigDto = {
      name: formData.name,
      crmType: formData.crmType,
      webhookConfig,
      syncProspects: formData.syncProspects,
      syncMeetings: formData.syncMeetings,
      syncOnCreate: formData.syncOnCreate,
      syncOnUpdate: formData.syncOnUpdate,
    };

    if (editConfig) {
      await updateConfig.mutateAsync({
        id: editConfig.id,
        dto: { ...dto, isActive: formData.isActive },
      });
    } else {
      await createConfig.mutateAsync(dto);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editConfig ? "Edit CRM Configuration" : "Add Webhook Integration"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Configuration Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="My CRM Integration"
                required
              />
            </div>

            {!editConfig && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Integration Type
                </label>
                <select
                  value={formData.crmType}
                  onChange={(e) => setFormData({ ...formData, crmType: e.target.value as CrmType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="webhook">Webhook</option>
                  <option value="csv_export">CSV Export</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For Salesforce, HubSpot, or Pipedrive, use the Connect buttons above.
                </p>
              </div>
            )}

            {formData.crmType === "webhook" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="https://api.example.com/webhook"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={formData.webhookMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookMethod: e.target.value as "POST" | "PUT" | "PATCH",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Headers (JSON)
                  </label>
                  <textarea
                    value={formData.webhookHeaders}
                    onChange={(e) => setFormData({ ...formData, webhookHeaders: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono text-sm"
                    rows={3}
                    placeholder='{"Authorization": "Bearer xxx"}'
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.syncProspects}
                  onChange={(e) => setFormData({ ...formData, syncProspects: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Sync prospects</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.syncMeetings}
                  onChange={(e) => setFormData({ ...formData, syncMeetings: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Sync meetings</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.syncOnCreate}
                  onChange={(e) => setFormData({ ...formData, syncOnCreate: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-sync on create
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.syncOnUpdate}
                  onChange={(e) => setFormData({ ...formData, syncOnUpdate: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-sync on update
                </span>
              </label>
              {editConfig && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createConfig.isPending || updateConfig.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createConfig.isPending || updateConfig.isPending
                  ? "Saving..."
                  : editConfig
                    ? "Update"
                    : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CrmSettingsPage() {
  const { data: configs, isLoading, refetch } = useCrmConfigs();
  const deleteConfig = useDeleteCrmConfig();
  const exportProspects = useExportProspectsCsv();
  const exportMeetings = useExportMeetingsCsv();

  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CrmConfig | null>(null);

  const handleDelete = async (config: CrmConfig) => {
    if (confirm(`Are you sure you want to delete "${config.name}"?`)) {
      await deleteConfig.mutateAsync(config.id);
    }
  };

  const connectedOAuthConfigs = configs?.filter(
    (c) => ["salesforce", "hubspot", "pipedrive"].includes(c.crmType) && c.isConnected,
  );
  const otherConfigs = configs?.filter(
    (c) => !["salesforce", "hubspot", "pipedrive"].includes(c.crmType) || !c.isConnected,
  );

  const configByProvider = (provider: CrmProvider) => configs?.find((c) => c.crmType === provider);

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Integration</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your CRM to sync prospects, contacts, and meetings
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connect a CRM</h2>
        <div className="grid gap-4">
          {CRM_PROVIDERS.map((provider) => (
            <OAuthProviderCard
              key={provider.id}
              provider={provider}
              existingConfig={configByProvider(provider.id)}
              onConnected={() => refetch()}
            />
          ))}
        </div>
      </div>

      {connectedOAuthConfigs && connectedOAuthConfigs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected CRM Integrations
          </h2>
          {connectedOAuthConfigs.map((config) => (
            <CrmConfigCard
              key={config.id}
              config={config}
              onEdit={() => {
                setEditingConfig(config);
                setShowModal(true);
              }}
              onDelete={() => handleDelete(config)}
            />
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CSV Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download your data as CSV files for import into any CRM system.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportProspects.mutate(undefined)}
            disabled={exportProspects.isPending}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
          >
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {exportProspects.isPending ? "Exporting..." : "Export Prospects"}
          </button>
          <button
            onClick={() => exportMeetings.mutate(undefined)}
            disabled={exportMeetings.isPending}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
          >
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {exportMeetings.isPending ? "Exporting..." : "Export Meetings"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Webhook Integrations
          </h2>
          <button
            onClick={() => {
              setEditingConfig(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Webhook
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : otherConfigs && otherConfigs.length > 0 ? (
          <div className="space-y-4">
            {otherConfigs.map((config) => (
              <CrmConfigCard
                key={config.id}
                config={config}
                onEdit={() => {
                  setEditingConfig(config);
                  setShowModal(true);
                }}
                onDelete={() => handleDelete(config)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Webhook Integrations
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Set up a webhook to sync your prospects and meetings with any custom system.
            </p>
            <button
              onClick={() => {
                setEditingConfig(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Webhook
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <CreateConfigModal
          editConfig={editingConfig}
          onClose={() => {
            setShowModal(false);
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}
