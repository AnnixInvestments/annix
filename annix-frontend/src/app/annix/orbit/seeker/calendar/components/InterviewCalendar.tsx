"use client";

import { useMemo, useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import type { SeekerInterviewBooking, SeekerInterviewEvent } from "@/app/lib/api/annixOrbitApi";
import { DateTime, formatTimeZA, fromISO, now } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCreateSeekerInterviewEvent,
  useOrbitDeleteSeekerInterviewEvent,
  useOrbitSeekerApplications,
  useOrbitSeekerInterviewEvents,
  useOrbitUpdateSeekerInterviewEvent,
} from "@/app/lib/query/hooks";
import { AddToCalendarButtons, type CalendarLinkEvent } from "./calendarLinks";

export interface InterviewCalendarPrefill {
  applyClickId: number | null;
  companyName: string | null;
  roleTitle: string | null;
}

interface CalendarItem {
  key: string;
  kind: "booking" | "self";
  selfId: number | null;
  startsAt: string;
  title: string;
  linkEvent: CalendarLinkEvent;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function combineDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  const dt = DateTime.fromISO(`${dateStr}T${timeStr}`);
  return dt.isValid ? dt.toISO() : null;
}

interface EventFormState {
  editingId: number | null;
  applyClickId: number | null;
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  companyName: string;
  roleTitle: string;
  locationLabel: string;
  notes: string;
}

function emptyForm(dateStr: string): EventFormState {
  return {
    editingId: null,
    applyClickId: null,
    dateStr,
    startTimeStr: "09:00",
    endTimeStr: "",
    companyName: "",
    roleTitle: "",
    locationLabel: "",
    notes: "",
  };
}

function formFromEvent(event: SeekerInterviewEvent): EventFormState {
  const start = fromISO(event.startsAt);
  const startDate = start.toISODate();
  const end = event.endsAt ? fromISO(event.endsAt) : null;
  return {
    editingId: event.id,
    applyClickId: event.applyClickId,
    dateStr: startDate ? startDate : "",
    startTimeStr: start.isValid ? start.toFormat("HH:mm") : "09:00",
    endTimeStr: end?.isValid ? end.toFormat("HH:mm") : "",
    companyName: event.companyName ? event.companyName : "",
    roleTitle: event.roleTitle ? event.roleTitle : "",
    locationLabel: event.locationLabel ? event.locationLabel : "",
    notes: event.notes ? event.notes : "",
  };
}

export function InterviewCalendar(props: {
  bookings: SeekerInterviewBooking[];
  prefill: InterviewCalendarPrefill | null;
}) {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  const eventsQuery = useOrbitSeekerInterviewEvents();
  const applicationsQuery = useOrbitSeekerApplications();
  const createMutation = useOrbitCreateSeekerInterviewEvent();
  const updateMutation = useOrbitUpdateSeekerInterviewEvent();
  const deleteMutation = useOrbitDeleteSeekerInterviewEvent();

  const eventsData = eventsQuery.data;
  const selfEvents = useMemo(() => (eventsData ? eventsData : []), [eventsData]);

  const applicationsData = applicationsQuery.data;
  const applications = useMemo(
    () => (applicationsData ? applicationsData : []),
    [applicationsData],
  );

  const [monthAnchor, setMonthAnchor] = useState(() => now().startOf("month"));
  const [form, setForm] = useState<EventFormState | null>(null);
  const [viewEvent, setViewEvent] = useState<CalendarLinkEvent | null>(null);

  const prefill = props.prefill;
  const [prefillConsumed, setPrefillConsumed] = useState(false);
  if (prefill && !prefillConsumed && !form) {
    const today = now().toISODate();
    setForm({
      ...emptyForm(today ? today : ""),
      applyClickId: prefill.applyClickId,
      companyName: prefill.companyName ? prefill.companyName : "",
      roleTitle: prefill.roleTitle ? prefill.roleTitle : "",
    });
    setPrefillConsumed(true);
  }

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const pushItem = (item: CalendarItem) => {
      const isoDate = fromISO(item.startsAt).toISODate();
      const dayKey = isoDate ? isoDate : "";
      const existing = map.get(dayKey);
      const list = existing ? existing : [];
      list.push(item);
      map.set(dayKey, list);
    };
    props.bookings.forEach((booking) => {
      const slot = booking.slot;
      if (!slot) return;
      const job = slot.jobPosting;
      const title = job ? job.title : "Interview";
      const location = slot.locationLabel ? slot.locationLabel : slot.locationAddress;
      pushItem({
        key: `booking-${booking.id}`,
        kind: "booking",
        selfId: null,
        startsAt: slot.startsAt,
        title,
        linkEvent: {
          uid: `booking-${booking.id}@orbit.annix`,
          title: `Interview: ${title}`,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          location: location ? location : null,
          description: null,
        },
      });
    });
    selfEvents.forEach((event) => {
      const companyName = event.companyName;
      const roleTitle = event.roleTitle;
      const title = roleTitle ? roleTitle : companyName ? companyName : "Interview";
      pushItem({
        key: `self-${event.id}`,
        kind: "self",
        selfId: event.id,
        startsAt: event.startsAt,
        title,
        linkEvent: {
          uid: `self-${event.id}@orbit.annix`,
          title: `Interview: ${title}`,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          location: event.locationLabel,
          description: event.notes,
        },
      });
    });
    Array.from(map.values()).forEach((list) => {
      list.sort((a, b) => fromISO(a.startsAt).toMillis() - fromISO(b.startsAt).toMillis());
    });
    return map;
  }, [props.bookings, selfEvents]);

  const gridDays = useMemo(() => {
    const gridStart = monthAnchor.startOf("week");
    return Array.from({ length: 42 }, (_, i) => gridStart.plus({ days: i }));
  }, [monthAnchor]);

  const monthLabel = monthAnchor.toFormat("LLLL yyyy");
  const todayKey = now().toISODate();
  const monthNumber = monthAnchor.month;

  const openCreateForDay = (dayIso: string) => {
    setForm(emptyForm(dayIso));
  };

  const openEditEvent = (eventId: number) => {
    const match = selfEvents.find((e) => e.id === eventId);
    if (match) setForm(formFromEvent(match));
  };

  const closeForm = () => setForm(null);

  const updateForm = (patch: Partial<EventFormState>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
  };

  const handleSubmit = async () => {
    if (!form) return;
    const startsAt = combineDateTime(form.dateStr, form.startTimeStr);
    if (!startsAt) {
      showToast("Pick a date and a start time for the interview.", "error");
      return;
    }
    const endsAt = form.endTimeStr ? combineDateTime(form.dateStr, form.endTimeStr) : null;
    const payload = {
      companyName: form.companyName.trim() ? form.companyName.trim() : null,
      roleTitle: form.roleTitle.trim() ? form.roleTitle.trim() : null,
      locationLabel: form.locationLabel.trim() ? form.locationLabel.trim() : null,
      notes: form.notes.trim() ? form.notes.trim() : null,
      startsAt,
      endsAt,
    };
    try {
      if (form.editingId != null) {
        await updateMutation.mutateAsync({ id: form.editingId, input: payload });
        showToast("Interview updated", "success");
      } else {
        await createMutation.mutateAsync({ ...payload, applyClickId: form.applyClickId });
        showToast("Interview added to your calendar", "success");
      }
      closeForm();
    } catch {
      alert({ message: "Couldn't save the interview — please try again", variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!form || form.editingId == null) return;
    const confirmed = await confirm({
      title: "Remove this interview?",
      message: "It will be removed from your calendar.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(form.editingId);
      showToast("Interview removed", "success");
      closeForm();
    } catch {
      alert({ message: "Couldn't remove the interview — please try again", variant: "error" });
    }
  };

  const creating = createMutation.isPending;
  const updating = updateMutation.isPending;
  const saving = creating || updating;
  const editing = form?.editingId != null;

  const editLinkEvent: CalendarLinkEvent | null = (() => {
    if (!form || form.editingId == null) return null;
    const startsAtIso = combineDateTime(form.dateStr, form.startTimeStr);
    if (!startsAtIso) return null;
    const endsAtIso = form.endTimeStr ? combineDateTime(form.dateStr, form.endTimeStr) : null;
    const role = form.roleTitle.trim();
    const company = form.companyName.trim();
    const titleCore = role ? role : company ? company : "Interview";
    const location = form.locationLabel.trim();
    const notes = form.notes.trim();
    return {
      uid: `self-${form.editingId}@orbit.annix`,
      title: `Interview: ${titleCore}`,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      location: location ? location : null,
      description: notes ? notes : null,
    };
  })();
  const inputClass =
    "mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-navbar-100,#e0e0f5)] focus:border-transparent";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--brand-navbar-100,#e0e0f5)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonthAnchor((m) => m.minus({ months: 1 }))}
            className="px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            ‹
          </button>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 min-w-[7rem] sm:min-w-[10rem] text-center">
            {monthLabel}
          </h2>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonthAnchor((m) => m.plus({ months: 1 }))}
            className="px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setMonthAnchor(now().startOf("month"))}
            className="ml-1 px-2 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          data-nix-target="interview-add-button"
          onClick={() => {
            const today = now().toISODate();
            openCreateForDay(today ? today : "");
          }}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
        >
          + Add interview
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-gray-500 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div
        data-nix-target="interview-calendar"
        className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden"
      >
        {gridDays.map((day) => {
          const dayIso = day.toISODate();
          const dayKey = dayIso ? dayIso : "";
          const dayItemsRaw = itemsByDay.get(dayKey);
          const dayItems = dayItemsRaw ? dayItemsRaw : [];
          const inMonth = day.month === monthNumber;
          const isToday = dayKey === todayKey;
          const cellBg = inMonth ? "bg-white" : "bg-gray-50";
          return (
            <button
              type="button"
              key={dayKey}
              onClick={() => openCreateForDay(dayKey)}
              className={`min-h-[3.5rem] sm:min-h-[5.5rem] p-1 sm:p-1.5 text-left align-top ${cellBg} hover:bg-[var(--brand-navbar-50,#f0f0fc)] transition-colors`}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  isToday
                    ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand-navbar,#323288)] text-white"
                    : inMonth
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {day.day}
              </div>
              <div className="space-y-1">
                {dayItems.map((item) => {
                  const isSelf = item.kind === "self";
                  const chipClass = isSelf
                    ? "bg-[var(--brand-accent,#FF8A00)]/15 text-[var(--brand-navbar,#323288)] border border-[var(--brand-accent,#FF8A00)]/40"
                    : "bg-[var(--brand-navbar-100,#e0e0f5)] text-[var(--brand-navbar,#323288)]";
                  return (
                    <span
                      key={item.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelf && item.selfId != null) {
                          openEditEvent(item.selfId);
                        } else {
                          setViewEvent(item.linkEvent);
                        }
                      }}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer ${chipClass}`}
                      title={`${formatTimeZA(item.startsAt)} · ${item.title}`}
                    >
                      {formatTimeZA(item.startsAt)} {item.title}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Tap a day to add your own interview. Employer-booked interviews appear automatically.
      </p>

      {form ? (
        <FormModal
          isOpen={true}
          onClose={closeForm}
          onSubmit={handleSubmit}
          title={editing ? "Edit interview" : "Add interview"}
          submitLabel={editing ? "Save changes" : "Add interview"}
          submitDataNixTarget="interview-submit"
          loading={saving}
          headerRight={
            editing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null
          }
        >
          <div className="space-y-4">
            {applications.length > 0 ? (
              <label className="block" data-nix-target="interview-application-select">
                <span className="text-sm text-gray-700">From your applications</span>
                <select
                  value={form.applyClickId != null ? String(form.applyClickId) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      updateForm({ applyClickId: null });
                      return;
                    }
                    const appId = Number.parseInt(value, 10);
                    const application = applications.find((a) => a.id === appId);
                    if (application) {
                      updateForm({
                        applyClickId: application.id,
                        companyName: application.company ? application.company : "",
                        roleTitle: application.title,
                      });
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">Pick a job you applied for (or enter manually below)</option>
                  {applications.map((application) => (
                    <option key={application.id} value={String(application.id)}>
                      {application.company
                        ? `${application.title} — ${application.company}`
                        : application.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label className="block" data-nix-target="interview-date">
                <span className="text-sm text-gray-700">Date</span>
                <DateInput
                  value={form.dateStr}
                  onChange={(value) => updateForm({ dateStr: value })}
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-sm text-gray-700">Start</span>
                  <input
                    type="time"
                    value={form.startTimeStr}
                    onChange={(e) => updateForm({ startTimeStr: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-700">End</span>
                  <input
                    type="time"
                    value={form.endTimeStr}
                    onChange={(e) => updateForm({ endTimeStr: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
            <label className="block">
              <span className="text-sm text-gray-700">Company</span>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateForm({ companyName: e.target.value })}
                placeholder="Who are you interviewing with?"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Role</span>
              <input
                type="text"
                value={form.roleTitle}
                onChange={(e) => updateForm({ roleTitle: e.target.value })}
                placeholder="e.g. Management Accountant"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Location</span>
              <input
                type="text"
                value={form.locationLabel}
                onChange={(e) => updateForm({ locationLabel: e.target.value })}
                placeholder="Address or video link"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-700">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={2}
                placeholder="Contact person, reference number, what to bring…"
                className={inputClass}
              />
            </label>
            {editLinkEvent ? (
              <div className="pt-3 border-t border-gray-100">
                <AddToCalendarButtons event={editLinkEvent} />
              </div>
            ) : null}
          </div>
        </FormModal>
      ) : null}

      {viewEvent ? (
        <FormModal
          isOpen={true}
          onClose={() => setViewEvent(null)}
          onSubmit={() => setViewEvent(null)}
          title={viewEvent.title.replace(/^Interview:\s*/, "")}
          hideFooter
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              {fromISO(viewEvent.startsAt).toFormat("EEEE d LLLL yyyy")} ·{" "}
              {formatTimeZA(viewEvent.startsAt)}
            </p>
            {viewEvent.location ? (
              <p className="text-sm text-gray-600">{viewEvent.location}</p>
            ) : null}
            <div className="pt-2 border-t border-gray-100">
              <AddToCalendarButtons event={viewEvent} />
            </div>
          </div>
        </FormModal>
      ) : null}
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}
