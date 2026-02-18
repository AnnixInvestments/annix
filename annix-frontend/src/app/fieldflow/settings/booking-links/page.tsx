"use client";

import Link from "next/link";
import { useState } from "react";
import { type BookingLink, type MeetingType } from "@/app/lib/api/annixRepApi";
import {
  useBookingLinks,
  useCreateBookingLink,
  useDeleteBookingLink,
  useUpdateBookingLink,
} from "@/app/lib/query/hooks";

const DAYS_OF_WEEK = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "video", label: "Video Call" },
  { value: "phone", label: "Phone Call" },
  { value: "in_person", label: "In-Person" },
];

interface BookingLinkFormData {
  name: string;
  meetingDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  availableDays: string[];
  availableStartHour: number;
  availableEndHour: number;
  maxDaysAhead: number;
  meetingType: MeetingType;
  location: string;
  description: string;
}

const defaultFormData: BookingLinkFormData = {
  name: "",
  meetingDurationMinutes: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  availableDays: ["1", "2", "3", "4", "5"],
  availableStartHour: 8,
  availableEndHour: 17,
  maxDaysAhead: 30,
  meetingType: "video",
  location: "",
  description: "",
};

function BookingLinkCard({
  link,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  link: BookingLink;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const [showCopied, setShowCopied] = useState(false);
  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/book/${link.slug}`
      : `/book/${link.slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bookingUrl);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{link.name}</h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                link.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {link.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {link.meetingDurationMinutes} min {link.meetingType.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={link.isActive ? "Deactivate" : "Activate"}
          >
            {link.isActive ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={bookingUrl}
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-gray-300"
        />
        <button
          onClick={handleCopy}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showCopied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Available:{" "}
        {link.availableDays
          .split(",")
          .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
          .join(", ")}{" "}
        | {link.availableStartHour}:00 - {link.availableEndHour}:00
      </div>
    </div>
  );
}

function BookingLinkForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialData?: BookingLinkFormData;
  onSubmit: (data: BookingLinkFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<BookingLinkFormData>(initialData ?? defaultFormData);

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day].sort(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Link Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          placeholder="30 Minute Discovery Call"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meeting Duration
          </label>
          <select
            value={formData.meetingDurationMinutes}
            onChange={(e) =>
              setFormData({ ...formData, meetingDurationMinutes: parseInt(e.target.value, 10) })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meeting Type
          </label>
          <select
            value={formData.meetingType}
            onChange={(e) =>
              setFormData({ ...formData, meetingType: e.target.value as MeetingType })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            {MEETING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Buffer Before (min)
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={formData.bufferBeforeMinutes}
            onChange={(e) =>
              setFormData({ ...formData, bufferBeforeMinutes: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Buffer After (min)
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={formData.bufferAfterMinutes}
            onChange={(e) =>
              setFormData({ ...formData, bufferAfterMinutes: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Available Days
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => handleDayToggle(day.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                formData.availableDays.includes(day.value)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Available Start Hour
          </label>
          <select
            value={formData.availableStartHour}
            onChange={(e) =>
              setFormData({ ...formData, availableStartHour: parseInt(e.target.value, 10) })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Available End Hour
          </label>
          <select
            value={formData.availableEndHour}
            onChange={(e) =>
              setFormData({ ...formData, availableEndHour: parseInt(e.target.value, 10) })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Max Days Ahead
        </label>
        <input
          type="number"
          min={1}
          max={365}
          value={formData.maxDaysAhead}
          onChange={(e) =>
            setFormData({ ...formData, maxDaysAhead: parseInt(e.target.value, 10) || 30 })
          }
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          How far in advance can people book?
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location (optional)
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          placeholder="Zoom / Google Meet / Office address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          placeholder="Brief description of the meeting"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function BookingLinksSettingsPage() {
  const { data: bookingLinks, isLoading } = useBookingLinks();
  const createBookingLink = useCreateBookingLink();
  const updateBookingLink = useUpdateBookingLink();
  const deleteBookingLink = useDeleteBookingLink();

  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null);

  const handleCreate = async (data: BookingLinkFormData) => {
    await createBookingLink.mutateAsync({
      name: data.name,
      meetingDurationMinutes: data.meetingDurationMinutes,
      bufferBeforeMinutes: data.bufferBeforeMinutes,
      bufferAfterMinutes: data.bufferAfterMinutes,
      availableDays: data.availableDays.join(","),
      availableStartHour: data.availableStartHour,
      availableEndHour: data.availableEndHour,
      maxDaysAhead: data.maxDaysAhead,
      meetingType: data.meetingType,
      location: data.location || undefined,
      description: data.description || undefined,
    });
    setShowForm(false);
  };

  const handleUpdate = async (data: BookingLinkFormData) => {
    if (!editingLink) return;
    await updateBookingLink.mutateAsync({
      id: editingLink.id,
      dto: {
        name: data.name,
        meetingDurationMinutes: data.meetingDurationMinutes,
        bufferBeforeMinutes: data.bufferBeforeMinutes,
        bufferAfterMinutes: data.bufferAfterMinutes,
        availableDays: data.availableDays.join(","),
        availableStartHour: data.availableStartHour,
        availableEndHour: data.availableEndHour,
        maxDaysAhead: data.maxDaysAhead,
        meetingType: data.meetingType,
        location: data.location || undefined,
        description: data.description || undefined,
      },
    });
    setEditingLink(null);
  };

  const handleToggleActive = async (link: BookingLink) => {
    await updateBookingLink.mutateAsync({
      id: link.id,
      dto: { isActive: !link.isActive },
    });
  };

  const handleDelete = async (link: BookingLink) => {
    if (!confirm(`Are you sure you want to delete "${link.name}"?`)) return;
    await deleteBookingLink.mutateAsync(link.id);
  };

  const linkToFormData = (link: BookingLink): BookingLinkFormData => ({
    name: link.name,
    meetingDurationMinutes: link.meetingDurationMinutes,
    bufferBeforeMinutes: link.bufferBeforeMinutes,
    bufferAfterMinutes: link.bufferAfterMinutes,
    availableDays: link.availableDays.split(","),
    availableStartHour: link.availableStartHour,
    availableEndHour: link.availableEndHour,
    maxDaysAhead: link.maxDaysAhead,
    meetingType: link.meetingType,
    location: link.location ?? "",
    description: link.description ?? "",
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/fieldflow/settings"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
            >
              &larr; Back to Settings
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Links</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create shareable links for prospects to book meetings with you.
            </p>
          </div>
          {!showForm && !editingLink && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + Create Link
            </button>
          )}
        </div>

        {(showForm || editingLink) && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingLink ? "Edit Booking Link" : "Create Booking Link"}
            </h2>
            <BookingLinkForm
              initialData={editingLink ? linkToFormData(editingLink) : undefined}
              onSubmit={editingLink ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingLink(null);
              }}
              isSubmitting={createBookingLink.isPending || updateBookingLink.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4" />
                <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : bookingLinks && bookingLinks.length > 0 ? (
          <div className="space-y-4">
            {bookingLinks.map((link) => (
              <BookingLinkCard
                key={link.id}
                link={link}
                onEdit={() => setEditingLink(link)}
                onDelete={() => handleDelete(link)}
                onToggleActive={() => handleToggleActive(link)}
              />
            ))}
          </div>
        ) : (
          !showForm && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No booking links yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first booking link to let prospects schedule meetings with you.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create your first link
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
