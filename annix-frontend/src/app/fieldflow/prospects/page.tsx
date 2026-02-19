"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { PullToRefresh } from "../components/PullToRefresh";
import { Skeleton } from "../components/Skeleton";

const GoogleMapLocationPicker = dynamic(() => import("@/app/components/GoogleMapLocationPicker"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-64 rounded-lg" />,
});

import type {
  CreateProspectDto,
  ImportProspectRow,
  Prospect,
  ProspectStatus,
} from "@/app/lib/api/annixRepApi";
import {
  useBulkDeleteProspects,
  useBulkUpdateProspectStatus,
  useCreateProspect,
  useDeleteProspect,
  useImportProspects,
  useProspectStats,
  useProspects,
  useProspectsCsvExport,
  useUpdateProspectStatus,
} from "@/app/lib/query/hooks";
import { QueryErrorFallback } from "../components/ErrorBoundary";
import { ProspectListSkeleton } from "../components/Skeleton";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const statusColors: Record<ProspectStatus, { bg: string; text: string }> = {
  new: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  contacted: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  qualified: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
  },
  proposal: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
  },
  won: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  lost: { bg: "bg-gray-100 dark:bg-gray-700/30", text: "text-gray-700 dark:text-gray-300" },
};

const statusLabels: Record<ProspectStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

function StatusBadge({ status }: { status: ProspectStatus }) {
  const colors = statusColors[status];
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
      {statusLabels[status]}
    </span>
  );
}

function ProspectCard({
  prospect,
  onStatusChange,
  onDelete,
  selectionMode,
  isSelected,
  onSelect,
}: {
  prospect: Prospect;
  onStatusChange: (id: number, status: ProspectStatus) => void;
  onDelete: (id: number) => void;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: (id: number, selected: boolean) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  const wazeUrl =
    prospect.latitude && prospect.longitude
      ? `https://waze.com/ul?ll=${prospect.latitude},${prospect.longitude}&navigate=yes`
      : null;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-4 transition-colors ${
        isSelected
          ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800"
          : "border-gray-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {selectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(prospect.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
          <div className="flex-1 min-w-0">
            <Link href={`/annix-rep/prospects/${prospect.id}`}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">
                {prospect.companyName}
              </h3>
            </Link>
            {prospect.contactName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {prospect.contactName}
                {prospect.contactTitle && ` - ${prospect.contactTitle}`}
              </p>
            )}
            {(prospect.city || prospect.province) && (
              <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-1">
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
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                {[prospect.city, prospect.province].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={prospect.status} />
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                />
              </svg>
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-20">
                  <div className="py-1">
                    <Link
                      href={`/annix-rep/prospects/${prospect.id}`}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      View Details
                    </Link>
                    {wazeUrl && (
                      <a
                        href={wazeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        Navigate (Waze)
                      </a>
                    )}
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                    <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Change Status
                    </div>
                    {(Object.keys(statusLabels) as ProspectStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          onStatusChange(prospect.id, status);
                          setShowActions(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 ${
                          prospect.status === status
                            ? "text-blue-600 dark:text-blue-400 font-medium"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                    <button
                      onClick={() => {
                        if (confirm("Delete this prospect?")) {
                          onDelete(prospect.id);
                        }
                        setShowActions(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        {prospect.contactPhone && (
          <a
            href={`tel:${prospect.contactPhone}`}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
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
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
              />
            </svg>
            <span className="truncate">{prospect.contactPhone}</span>
          </a>
        )}
        {prospect.contactEmail && (
          <a
            href={`mailto:${prospect.contactEmail}`}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
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
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <span className="truncate max-w-[150px]">{prospect.contactEmail}</span>
          </a>
        )}
        {prospect.priority && (
          <span className={`flex items-center gap-1 ${priorityColors[prospect.priority]}`}>
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
                d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
              />
            </svg>
            <span className="capitalize">{prospect.priority}</span>
          </span>
        )}
      </div>

      {prospect.estimatedValue && (
        <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
          R {prospect.estimatedValue.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function CreateProspectModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (dto: CreateProspectDto) => void;
}) {
  const [formData, setFormData] = useState<CreateProspectDto>({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    streetAddress: "",
    city: "",
    province: "",
    priority: "medium",
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) return;
    onCreate(formData);
    setFormData({
      companyName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      streetAddress: "",
      city: "",
      province: "",
      priority: "medium",
    });
  };

  const handleLocationSelect = (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string },
  ) => {
    setFormData({
      ...formData,
      latitude: location.lat,
      longitude: location.lng,
      streetAddress: addressComponents?.address || formData.streetAddress,
      province: addressComponents?.region || formData.province,
    });
    setShowLocationPicker(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"
            onClick={onClose}
          />
          <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Prospect</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.streetAddress || ""}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    placeholder="Street address"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center gap-1"
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
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    Map
                  </button>
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    Location set: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Create Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showLocationPicker && (
        <GoogleMapLocationPicker
          apiKey={GOOGLE_MAPS_API_KEY}
          initialLocation={
            formData.latitude && formData.longitude
              ? { lat: formData.latitude, lng: formData.longitude }
              : undefined
          }
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
          config="responsive"
        />
      )}
    </>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): ImportProspectRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));

  const fieldMap: Record<string, keyof ImportProspectRow> = {
    companyname: "companyName",
    company: "companyName",
    contactname: "contactName",
    contact: "contactName",
    name: "contactName",
    email: "contactEmail",
    contactemail: "contactEmail",
    phone: "contactPhone",
    contactphone: "contactPhone",
    telephone: "contactPhone",
    title: "contactTitle",
    contacttitle: "contactTitle",
    jobtitle: "contactTitle",
    address: "streetAddress",
    streetaddress: "streetAddress",
    street: "streetAddress",
    city: "city",
    province: "province",
    state: "province",
    region: "province",
    postalcode: "postalCode",
    postal: "postalCode",
    zip: "postalCode",
    zipcode: "postalCode",
    country: "country",
    status: "status",
    priority: "priority",
    notes: "notes",
    tags: "tags",
    estimatedvalue: "estimatedValue",
    value: "estimatedValue",
  };

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: ImportProspectRow = {};

    headers.forEach((header, i) => {
      const field = fieldMap[header];
      if (field && values[i]) {
        row[field] = values[i];
      }
    });

    return row;
  });
}

function ImportProspectsModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: ImportProspectRow[]) => Promise<void>;
  isImporting: boolean;
}) {
  const [parsedRows, setParsedRows] = useState<ImportProspectRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.companyName?.trim());
    await onImport(validRows);
    setParsedRows([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const validRowsCount = parsedRows.filter((r) => r.companyName?.trim()).length;
  const invalidRowsCount = parsedRows.length - validRowsCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity"
          onClick={handleClose}
        />
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import Prospects
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  dark:file:bg-blue-900/30 dark:file:text-blue-300
                  hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Required columns: Company Name. Optional: Contact Name, Email, Phone, City, Status,
                Priority, etc.
              </p>
            </div>

            {parsedRows.length > 0 && (
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preview ({fileName})
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      {validRowsCount} valid
                    </span>
                    {invalidRowsCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {invalidRowsCount} missing company name
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="pb-2 pr-4">Company</th>
                        <th className="pb-2 pr-4">Contact</th>
                        <th className="pb-2 pr-4">Email</th>
                        <th className="pb-2">City</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className={!row.companyName?.trim() ? "opacity-50" : ""}>
                          <td className="py-2 pr-4 text-gray-900 dark:text-white">
                            {row.companyName || <span className="text-red-500">Missing</span>}
                          </td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                            {row.contactName || "-"}
                          </td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                            {row.contactEmail || "-"}
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">
                            {row.city || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      ...and {parsedRows.length - 10} more rows
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validRowsCount === 0 || isImporting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              Import {validRowsCount} Prospect{validRowsCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProspectsPage() {
  const { data: prospects, isLoading, error, refetch } = useProspects();
  const { data: stats } = useProspectStats();
  const createProspect = useCreateProspect();
  const deleteProspect = useDeleteProspect();
  const updateStatus = useUpdateProspectStatus();
  const bulkUpdateStatus = useBulkUpdateProspectStatus();
  const bulkDelete = useBulkDeleteProspects();
  const exportCsv = useProspectsCsvExport();
  const importProspects = useImportProspects();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);

  if (isLoading) {
    return <ProspectListSkeleton />;
  }

  if (error) {
    return (
      <QueryErrorFallback
        error={error}
        refetch={refetch}
        title="Unable to load prospects"
        message="We couldn't fetch your prospects. Please check your connection and try again."
      />
    );
  }

  const allTags = Array.from(
    new Set((prospects ?? []).flatMap((p) => p.tags ?? []).filter(Boolean)),
  ).sort();

  const filteredProspects = (prospects ?? []).filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (tagFilter && !(p.tags ?? []).includes(tagFilter)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.companyName.toLowerCase().includes(query) ||
        (p.contactName?.toLowerCase().includes(query) ?? false) ||
        (p.city?.toLowerCase().includes(query) ?? false) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleCreate = async (dto: CreateProspectDto) => {
    await createProspect.mutateAsync(dto);
    setShowCreateModal(false);
  };

  const handleStatusChange = async (id: number, status: ProspectStatus) => {
    await updateStatus.mutateAsync({ id, status });
  };

  const handleDelete = async (id: number) => {
    await deleteProspect.mutateAsync(id);
  };

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
    }
  };

  const handleBulkStatusChange = async (status: ProspectStatus) => {
    await bulkUpdateStatus.mutateAsync({ ids: Array.from(selectedIds), status });
    setSelectedIds(new Set());
    setSelectionMode(false);
    setShowBulkStatusMenu(false);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedIds.size} prospect(s)?`)) {
      await bulkDelete.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  const handleExportCsv = async () => {
    const blob = await exportCsv.mutateAsync();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospects.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  const handleImport = async (rows: ImportProspectRow[]) => {
    await importProspects.mutateAsync({ rows, skipInvalid: true });
    setShowImportModal(false);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prospects</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your sales pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={exportCsv.isPending}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2 disabled:opacity-50"
              title="Export to CSV"
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
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2"
              title="Import from CSV"
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
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`px-3 py-2 text-sm font-medium border rounded-md flex items-center gap-2 ${
                selectionMode
                  ? "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                  : "text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
              title={selectionMode ? "Exit selection mode" : "Select multiple"}
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
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="hidden sm:inline">{selectionMode ? "Cancel" : "Select"}</span>
            </button>
            <Link
              href="/annix-rep/prospects/nearby"
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2"
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
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <span className="hidden sm:inline">Find Nearby</span>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add Prospect</span>
            </button>
          </div>
        </div>

        {selectionMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-700 dark:text-blue-300 hover:underline"
              >
                {selectedIds.size === filteredProspects.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Change Status
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
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {showBulkStatusMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowBulkStatusMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-20">
                      <div className="py-1">
                        {(Object.keys(statusLabels) as ProspectStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleBulkStatusChange(status)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            {statusLabels[status]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {(Object.keys(statusLabels) as ProspectStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  statusFilter === status
                    ? `${statusColors[status].bg} ${statusColors[status].text} border-transparent`
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {statusLabels[status]} ({stats[status] ?? 0})
              </button>
            ))}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Tags:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2 py-1 text-sm rounded-full transition-colors ${
                  tagFilter === tag
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                }`}
              >
                {tag}
              </button>
            ))}
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="Search prospects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>

        {filteredProspects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== "all"
                ? "No prospects match your filters"
                : "No prospects yet"}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Add your first prospect
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(prospect.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        <CreateProspectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />

        <ImportProspectsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          isImporting={importProspects.isPending}
        />
      </div>
    </PullToRefresh>
  );
}
