"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import GoogleMapLocationPicker from "@/app/components/GoogleMapLocationPicker";
import type { CreateProspectDto, ProspectStatus } from "@/app/lib/api/fieldflowApi";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";
import {
  useDeleteProspect,
  useMarkContacted,
  useProspect,
  useProspectVisits,
  useUpdateProspect,
  useUpdateProspectStatus,
} from "@/app/lib/query/hooks";

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

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: prospect, isLoading, error } = useProspect(id);
  const { data: visits } = useProspectVisits(id);
  const updateProspect = useUpdateProspect();
  const updateStatus = useUpdateProspectStatus();
  const markContacted = useMarkContacted();
  const deleteProspect = useDeleteProspect();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CreateProspectDto>>({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">Failed to load prospect</p>
        <Link
          href="/fieldflow/prospects"
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to prospects
        </Link>
      </div>
    );
  }

  const wazeUrl =
    prospect.latitude && prospect.longitude
      ? `https://waze.com/ul?ll=${prospect.latitude},${prospect.longitude}&navigate=yes`
      : null;

  const googleMapsUrl =
    prospect.latitude && prospect.longitude
      ? `https://www.google.com/maps?q=${prospect.latitude},${prospect.longitude}`
      : null;

  const handleStartEdit = () => {
    setEditForm({
      companyName: prospect.companyName,
      contactName: prospect.contactName ?? "",
      contactEmail: prospect.contactEmail ?? "",
      contactPhone: prospect.contactPhone ?? "",
      contactTitle: prospect.contactTitle ?? "",
      streetAddress: prospect.streetAddress ?? "",
      city: prospect.city ?? "",
      province: prospect.province ?? "",
      postalCode: prospect.postalCode ?? "",
      latitude: prospect.latitude ?? undefined,
      longitude: prospect.longitude ?? undefined,
      notes: prospect.notes ?? "",
      priority: prospect.priority,
      estimatedValue: prospect.estimatedValue ?? undefined,
    });
    setIsEditing(true);
  };

  const handleLocationSelect = (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string },
  ) => {
    setEditForm({
      ...editForm,
      latitude: location.lat,
      longitude: location.lng,
      streetAddress: addressComponents?.address || editForm.streetAddress,
      province: addressComponents?.region || editForm.province,
    });
    setShowLocationPicker(false);
  };

  const handleSave = async () => {
    await updateProspect.mutateAsync({ id, dto: editForm });
    setIsEditing(false);
  };

  const handleStatusChange = async (status: ProspectStatus) => {
    await updateStatus.mutateAsync({ id, status });
  };

  const handleMarkContacted = async () => {
    await markContacted.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this prospect?")) {
      await deleteProspect.mutateAsync(id);
      router.push("/fieldflow/prospects");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow/prospects"
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
            {prospect.companyName}
          </h1>
          {prospect.contactName && (
            <p className="text-gray-500 dark:text-gray-400">
              {prospect.contactName}
              {prospect.contactTitle && ` - ${prospect.contactTitle}`}
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1.5 text-sm font-medium rounded-full ${statusColors[prospect.status].bg} ${statusColors[prospect.status].text}`}
        >
          {statusLabels[prospect.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h2>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editForm.companyName ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editForm.contactName ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.contactEmail ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.contactPhone ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.streetAddress ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
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
                  {editForm.latitude && editForm.longitude && (
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
                      Location set: {editForm.latitude.toFixed(5)}, {editForm.longitude.toFixed(5)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={editForm.city ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Province
                    </label>
                    <input
                      type="text"
                      value={editForm.province ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={editForm.postalCode ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.notes ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateProspect.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateProspect.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {prospect.contactEmail && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={`mailto:${prospect.contactEmail}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {prospect.contactEmail}
                        </a>
                      </dd>
                    </div>
                  )}
                  {prospect.contactPhone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Phone
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={`tel:${prospect.contactPhone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {prospect.contactPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                </div>

                {(prospect.streetAddress || prospect.city || prospect.province) && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Address
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-white">
                      {[
                        prospect.streetAddress,
                        prospect.city,
                        prospect.province,
                        prospect.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                )}

                {prospect.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                    <dd className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                      {prospect.notes}
                    </dd>
                  </div>
                )}

                {prospect.estimatedValue && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Estimated Value
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                      R {prospect.estimatedValue.toLocaleString()}
                    </dd>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Visit History
            </h2>
            {!visits || visits.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No visits recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                      <svg
                        className="w-4 h-4 text-gray-600 dark:text-gray-400"
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
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {visit.visitType.replace("_", " ")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {visit.startedAt
                          ? formatDateTimeZA(visit.startedAt.toString())
                          : "Not started"}
                      </p>
                      {visit.outcome && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded capitalize">
                          {visit.outcome.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-3">
              {prospect.contactPhone && (
                <a
                  href={`tel:${prospect.contactPhone}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
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
                  Call
                </a>
              )}

              {wazeUrl && (
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
                  Navigate (Waze)
                </a>
              )}

              <button
                onClick={handleMarkContacted}
                disabled={markContacted.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
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
                {markContacted.isPending ? "Updating..." : "Mark Contacted"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Update Status
            </h2>
            <div className="space-y-2">
              {(Object.keys(statusLabels) as ProspectStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={prospect.status === status || updateStatus.isPending}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    prospect.status === status
                      ? `${statusColors[status].bg} ${statusColors[status].text} font-medium`
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Info</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDateZA(prospect.createdAt.toString())}
                </dd>
              </div>
              {prospect.lastContactedAt && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Last Contacted</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formatDateTimeZA(prospect.lastContactedAt.toString())}
                  </dd>
                </div>
              )}
              {prospect.nextFollowUpAt && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Next Follow-up</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formatDateZA(prospect.nextFollowUpAt.toString())}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30"
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
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Delete Prospect
          </button>
        </div>
      </div>

      {showLocationPicker && (
        <GoogleMapLocationPicker
          apiKey={GOOGLE_MAPS_API_KEY}
          initialLocation={
            editForm.latitude && editForm.longitude
              ? { lat: editForm.latitude, lng: editForm.longitude }
              : undefined
          }
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
          config="responsive"
        />
      )}
    </div>
  );
}
