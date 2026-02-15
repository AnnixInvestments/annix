"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CreateCrmConfigDto,
  CrmConfig,
  CrmType,
  WebhookConfig,
} from "@/app/lib/api/fieldflowApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import {
  useCreateCrmConfig,
  useCrmConfigs,
  useCrmSyncStatus,
  useDeleteCrmConfig,
  useExportMeetingsCsv,
  useExportProspectsCsv,
  useSyncAllProspectsToCrm,
  useTestCrmConnection,
  useUpdateCrmConfig,
} from "@/app/lib/query/hooks";

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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    const result = await testConnection.mutateAsync(config.id);
    setTestResult(result);
  };

  const handleSync = async () => {
    await syncAll.mutateAsync(config.id);
  };

  const crmTypeLabels: Record<CrmType, string> = {
    webhook: "Webhook",
    csv_export: "CSV Export",
    salesforce: "Salesforce",
    hubspot: "HubSpot",
    pipedrive: "Pipedrive",
    custom: "Custom",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.name}</h3>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                config.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
              }`}
            >
              {config.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {crmTypeLabels[config.crmType]}
            {config.webhookConfig?.url && (
              <span className="ml-2 text-gray-400">
                {config.webhookConfig.url.substring(0, 50)}
                {config.webhookConfig.url.length > 50 ? "..." : ""}
              </span>
            )}
          </p>
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

      <div className="flex items-center gap-2">
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
      </div>
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
            {editConfig ? "Edit CRM Configuration" : "Add CRM Configuration"}
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
            </div>

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
  const { data: configs, isLoading } = useCrmConfigs();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Integration</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure CRM sync and webhooks</p>
        </div>
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
          Add Integration
        </button>
      </div>

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

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : configs && configs.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configured Integrations
          </h2>
          {configs.map((config) => (
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
            No CRM Integrations
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Set up a webhook to sync your prospects and meetings with your CRM.
          </p>
          <button
            onClick={() => {
              setEditingConfig(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Integration
          </button>
        </div>
      )}

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
