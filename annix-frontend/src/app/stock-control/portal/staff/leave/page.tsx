"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CreateLeaveRequest,
  LeaveType,
  StaffLeaveRecord,
} from "@/app/lib/api/stock-control-api/types";
import { DateTime } from "@/app/lib/datetime";
import {
  useAdminDeleteLeaveRecord,
  useCreateLeaveRecord,
  useDeleteLeaveRecord,
  useLeaveRecords,
  useSickNoteUrl,
  useUploadSickNote,
} from "@/app/lib/query/hooks";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarDay {
  date: DateTime;
  isCurrentMonth: boolean;
  isToday: boolean;
  records: StaffLeaveRecord[];
}

function leaveTypeBadgeColor(type: LeaveType): string {
  if (type === "sick") {
    return "bg-red-100 text-red-700";
  }
  return "bg-blue-100 text-blue-700";
}

function leaveTypeLabel(type: LeaveType): string {
  if (type === "sick") {
    return "Sick";
  }
  return "Holiday";
}

export default function StaffLeavePage() {
  const { user, profile } = useStockControlAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "manager";

  const [currentMonth, setCurrentMonth] = useState(() => DateTime.now().startOf("month"));
  const [error, setError] = useState<string | null>(null);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType>("sick");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [sickNoteFile, setSickNoteFile] = useState<File | null>(null);
  const [uploadingNote, setUploadingNote] = useState(false);

  const [viewingRecord, setViewingRecord] = useState<StaffLeaveRecord | null>(null);
  const [sickNoteViewUrl, setSickNoteViewUrl] = useState<string | null>(null);
  const [loadingSickNote, setLoadingSickNote] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: records = [], isLoading: loading } = useLeaveRecords(
    currentMonth.year,
    currentMonth.month,
  );
  const createLeaveMutation = useCreateLeaveRecord();
  const uploadSickNoteMutation = useUploadSickNote();
  const deleteLeaveMutation = useDeleteLeaveRecord();
  const adminDeleteLeaveMutation = useAdminDeleteLeaveRecord();
  const sickNoteUrlMutation = useSickNoteUrl();

  const handleMonthChange = useCallback(
    (direction: number) => {
      const next = currentMonth.plus({ months: direction });
      setCurrentMonth(next);
    },
    [currentMonth],
  );

  const calendarDays = useMemo((): CalendarDay[] => {
    const monthStart = currentMonth.startOf("month");
    const monthEnd = currentMonth.endOf("month");
    const today = DateTime.now().startOf("day");

    const startWeekday = monthStart.weekday;
    const calStart = monthStart.minus({ days: startWeekday - 1 });

    const totalDays = 42;
    return Array.from({ length: totalDays }, (_, i) => {
      const date = calStart.plus({ days: i });
      const dateStr = date.toISODate() || "";
      const isCurrentMonth = date >= monthStart && date <= monthEnd;

      const dayRecords = records.filter((r) => {
        const rStart = r.startDate;
        const rEnd = r.endDate;
        return dateStr >= rStart && dateStr <= rEnd;
      });

      return {
        date,
        isCurrentMonth,
        isToday: date.hasSame(today, "day"),
        records: dayRecords,
      };
    });
  }, [currentMonth, records]);

  const handleDayClick = useCallback((day: CalendarDay) => {
    const dateStr = day.date.toISODate() || "";
    setSelectedDate(dateStr);
    setStartDate(dateStr);
    setEndDate(dateStr);
    setLeaveType("sick");
    setNotes("");
    setSickNoteFile(null);
    setShowRecordModal(true);
  }, []);

  const handleSaveLeave = useCallback(async () => {
    if (!startDate || !endDate) return;

    setSaving(true);
    setError(null);
    try {
      const payload: CreateLeaveRequest = {
        leaveType,
        startDate,
        endDate,
        ...(notes ? { notes } : {}),
      };
      const newRecord = await createLeaveMutation.mutateAsync(payload);

      if (sickNoteFile && leaveType === "sick") {
        setUploadingNote(true);
        await uploadSickNoteMutation.mutateAsync({ recordId: newRecord.id, file: sickNoteFile });
        setUploadingNote(false);
      }

      setShowRecordModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save leave record";
      setError(message);
    } finally {
      setSaving(false);
      setUploadingNote(false);
    }
  }, [
    startDate,
    endDate,
    leaveType,
    notes,
    sickNoteFile,
    createLeaveMutation,
    uploadSickNoteMutation,
  ]);

  const handleDeleteRecord = useCallback(
    async (record: StaffLeaveRecord) => {
      try {
        const userId = user?.id;
        if (isAdmin && record.userId !== userId) {
          await adminDeleteLeaveMutation.mutateAsync(record.id);
        } else {
          await deleteLeaveMutation.mutateAsync(record.id);
        }
        setViewingRecord(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete record";
        setError(message);
      }
    },
    [isAdmin, user, adminDeleteLeaveMutation, deleteLeaveMutation],
  );

  const handleViewSickNote = useCallback(
    async (record: StaffLeaveRecord) => {
      setViewingRecord(record);
      setSickNoteViewUrl(null);
      if (record.sickNoteUrl) {
        setLoadingSickNote(true);
        try {
          const result = await sickNoteUrlMutation.mutateAsync(record.id);
          setSickNoteViewUrl(result.url);
        } catch {
          setSickNoteViewUrl(null);
        } finally {
          setLoadingSickNote(false);
        }
      }
    },
    [sickNoteUrlMutation],
  );

  const handleSickToday = useCallback(() => {
    const today = DateTime.now().toISODate() || "";
    setStartDate(today);
    setEndDate(today);
    setLeaveType("sick");
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Leave</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => handleMonthChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentMonth.toFormat("MMMM yyyy")}
          </h2>
          <button
            type="button"
            onClick={() => handleMonthChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dateKey = day.date.toISODate() || day.date.toMillis().toString();
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`min-h-[60px] sm:min-h-[80px] p-0.5 sm:p-1 border-b border-r border-gray-100 text-left transition-colors hover:bg-gray-50 ${
                  !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                    day.isToday ? "bg-teal-600 text-white font-bold" : "text-gray-700"
                  }`}
                >
                  {day.date.day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {day.records.slice(0, 3).map((record) => {
                    const recName = record.userName ? record.userName : "User";
                    return (
                      <div
                        key={record.id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${leaveTypeBadgeColor(record.leaveType)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSickNote(record);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            handleViewSickNote(record);
                          }
                        }}
                      >
                        {recName} - {leaveTypeLabel(record.leaveType)}
                      </div>
                    );
                  })}
                  {day.records.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1">
                      +{day.records.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Record Leave</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType("sick")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      leaveType === "sick"
                        ? "bg-red-50 border-red-300 text-red-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Sick
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType("holiday")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      leaveType === "holiday"
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Holiday
                  </button>
                </div>
              </div>

              {leaveType === "sick" && (
                <button
                  type="button"
                  onClick={handleSickToday}
                  className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm text-red-700 transition-colors"
                >
                  Mark Sick Today Only
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              {leaveType === "sick" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sick Note (optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={(e) => {
                      const files = e.target.files;
                      const picked = files ? files[0] : null;
                      setSickNoteFile(picked || null);
                    }}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Take a photo or upload your sick note
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLeave}
                disabled={saving || uploadingNote || !startDate || !endDate}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : uploadingNote ? "Uploading note..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Leave Details</h3>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${leaveTypeBadgeColor(viewingRecord.leaveType)}`}
                >
                  {leaveTypeLabel(viewingRecord.leaveType)}
                </span>
                <span className="text-sm text-gray-700 font-medium">
                  {viewingRecord.userName ? viewingRecord.userName : "Unknown User"}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Dates:</span> {viewingRecord.startDate} to{" "}
                {viewingRecord.endDate}
              </div>
              {viewingRecord.notes && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Notes:</span> {viewingRecord.notes}
                </div>
              )}
              {viewingRecord.sickNoteUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Sick Note</p>
                  {loadingSickNote && <p className="text-sm text-gray-500">Loading sick note...</p>}
                  {sickNoteViewUrl && (
                    <div className="flex gap-2">
                      <a
                        href={sickNoteViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View
                      </a>
                      <a
                        href={sickNoteViewUrl}
                        download={
                          viewingRecord.sickNoteOriginalFilename
                            ? viewingRecord.sickNoteOriginalFilename
                            : "sick-note"
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              {(viewingRecord.userId === (user ? user.id : null) || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDeleteRecord(viewingRecord)}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
