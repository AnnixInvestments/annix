"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { adminApiClient, type OrbitOutreachSendResult } from "@/app/lib/api/adminApi";
import { fromISO, now } from "@/app/lib/datetime";
import {
  useAdminOrbitOutreachAssets,
  useAdminOrbitOutreachSchedules,
  useCancelOrbitOutreachSchedule,
  useDeleteOrbitOutreachAsset,
  useOrbitTierPlans,
  useRunDueOrbitOutreach,
  useScheduleOrbitOutreach,
  useUploadOrbitOutreachAsset,
} from "@/app/lib/query/hooks";

export interface OrbitEmailComposerRecipient {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  ageRange?: string | null;
  device?: string | null;
}

interface OrbitEmailComposerProps {
  open: boolean;
  onClose: () => void;
  recipients: OrbitEmailComposerRecipient[];
  trackEarlyAccess: boolean;
  contextLabel: string;
}

const GUIDE_SLOTS: Array<{ slot: string; label: string }> = [
  { slot: "iphone-guide", label: "iPhone install guide" },
  { slot: "android-guide", label: "Android install guide" },
  { slot: "fbw-guide", label: "Feedback Widget guide" },
];

const DEFAULT_SUBJECT = "Annix Orbit — early access & how to get started";

const DEFAULT_BODY = `Thanks for joining the Annix Orbit early access — you're one of the very first people to test it, so please go in expecting a few rough edges. There will likely be bugs and half-finished bits, and that's exactly what this stage is for.

Reporting issues — the Feedback Widget
You'll see a small round blue button in the bottom-right corner of every screen. Tap it to report anything. It automatically grabs a screenshot of what you're looking at and lets you either type or record a quick voice note describing the problem.

A few things worth knowing:
• Issues won't always be fixed on the spot, but I'll work through them and aim to have them sorted within 12–24 hours.
• Please use the same button for improvements too, not just bugs — different button colours, a smoother workflow, or even a whole feature you think is missing. I'm open to any and all feedback.

Getting the app onto your phone
Annix Orbit isn't in the Play Store / App Store yet, so it installs a little differently. Follow the steps in the attached guide for your device and you'll be up and running in a couple of minutes.

Tiers
The app will probably start you on the lowest tier. You can switch between tiers freely and at no cost, so don't worry about the prices you see — they're just there to show how each tier is structured. I'd really like you to move between the tiers and tell me what you think of how I've set them up and what each one limits.

One last thing: the jobs on the site are real. So if it happens to help you find a job along the way, then I'll call that a success.

Let me know what you think.

Thanks,
Andy`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OrbitEmailComposer(props: OrbitEmailComposerProps) {
  const recipients = props.recipients;
  const { showToast } = useToast();
  const assetsQuery = useAdminOrbitOutreachAssets();
  const uploadAsset = useUploadOrbitOutreachAsset();
  const deleteAsset = useDeleteOrbitOutreachAsset();
  const scheduleMutation = useScheduleOrbitOutreach();
  const schedulesQuery = useAdminOrbitOutreachSchedules();
  const cancelSchedule = useCancelOrbitOutreachSchedule();
  const runDue = useRunDueOrbitOutreach();
  const tierPlansQuery = useOrbitTierPlans();

  const assets = assetsQuery.data ? assetsQuery.data : [];
  const extras = assets.filter((a) => a.slot === "extra");
  const schedules = schedulesQuery.data ? schedulesQuery.data : [];
  const pendingSchedules = schedules.filter((s) => s.status === "pending");
  const tierPlans = tierPlansQuery.data ? tierPlansQuery.data : [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(recipients.map((r) => r.id)),
  );
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [environment, setEnvironment] = useState<"prod" | "test">("prod");
  const [includeDeviceGuide, setIncludeDeviceGuide] = useState(true);
  const [includeFbwGuide, setIncludeFbwGuide] = useState(true);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<OrbitOutreachSendResult | null>(null);
  const [uploadSlot, setUploadSlot] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [provisionAccount, setProvisionAccount] = useState(false);
  const [provisionTier, setProvisionTier] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlotRef = useRef<string | null>(null);

  const selectedCount = selectedIds.size;
  const allSelected = recipients.length > 0 && selectedCount === recipients.length;

  const selectedRecipients = useMemo(
    () => recipients.filter((r) => selectedIds.has(r.id)),
    [recipients, selectedIds],
  );

  if (!props.open) {
    return null;
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recipients.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleExtra = (id: string) => {
    const exists = selectedExtraIds.includes(id);
    setSelectedExtraIds(
      exists ? selectedExtraIds.filter((x) => x !== id) : [...selectedExtraIds, id],
    );
  };

  const triggerUpload = (slot: string) => {
    pendingSlotRef.current = slot;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    const slot = pendingSlotRef.current;
    if (!file || !slot) {
      return;
    }
    setUploadSlot(slot);
    try {
      await uploadAsset.mutateAsync({ slot, label: slot === "extra" ? file.name : null, file });
      showToast("Guide uploaded", "success");
    } catch {
      showToast("Upload failed — please try again.", "error");
    } finally {
      setUploadSlot(null);
      pendingSlotRef.current = null;
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset.mutateAsync(id);
      setSelectedExtraIds((prev) => prev.filter((x) => x !== id));
    } catch {
      showToast("Could not delete attachment.", "error");
    }
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      showToast("Select at least one recipient.", "error");
      return;
    }
    if (subject.trim() === "") {
      showToast("Add a subject.", "error");
      return;
    }
    if (provisionAccount && !provisionTier) {
      showToast("Pick an Orbit Seeker tier.", "error");
      return;
    }
    setSending(true);
    setResult(null);
    setProgress({ done: 0, total: selectedRecipients.length });

    let sent = 0;
    const failures: string[] = [];

    for (const recipient of selectedRecipients) {
      try {
        const res = await adminApiClient.sendOrbitOutreach({
          subject: subject.trim(),
          body,
          environment,
          recipients: [
            {
              email: recipient.email,
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              mobile: recipient.mobile,
              ageRange: recipient.ageRange,
              device: recipient.device,
            },
          ],
          includeDeviceGuide,
          includeFbwGuide,
          extraAssetIds: selectedExtraIds,
          trackEarlyAccess: props.trackEarlyAccess,
          provisionTier: provisionAccount && provisionTier ? provisionTier : null,
        });
        sent += res.sent;
        failures.push(...res.failures);
      } catch {
        failures.push(recipient.email);
      }
      setProgress((prev) => ({ done: prev.done + 1, total: prev.total }));
    }

    setSending(false);
    setResult({
      total: selectedRecipients.length,
      sent,
      failed: failures.length,
      failures,
    });
  };

  const handleSchedule = async () => {
    if (selectedRecipients.length === 0) {
      showToast("Select at least one recipient.", "error");
      return;
    }
    if (subject.trim() === "") {
      showToast("Add a subject.", "error");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      showToast("Pick a date and time.", "error");
      return;
    }
    if (provisionAccount && !provisionTier) {
      showToast("Pick an Orbit Seeker tier.", "error");
      return;
    }
    const scheduledAt = fromISO(`${scheduleDate}T${scheduleTime}`);
    const isValidSchedule = scheduledAt.isValid;
    const scheduledMillis = scheduledAt.toMillis();
    if (!isValidSchedule || scheduledMillis <= now().toMillis()) {
      showToast("Choose a date and time in the future.", "error");
      return;
    }
    setScheduling(true);
    try {
      await scheduleMutation.mutateAsync({
        subject: subject.trim(),
        body,
        environment,
        recipients: selectedRecipients.map((r) => ({
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          mobile: r.mobile,
          ageRange: r.ageRange,
          device: r.device,
        })),
        includeDeviceGuide,
        includeFbwGuide,
        extraAssetIds: selectedExtraIds,
        trackEarlyAccess: props.trackEarlyAccess,
        provisionTier: provisionAccount && provisionTier ? provisionTier : null,
        scheduledAt: scheduledAt.toISO() ?? "",
      });
      setScheduleConfirmed(true);
    } catch {
      showToast("Could not schedule the send — please try again.", "error");
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await cancelSchedule.mutateAsync(id);
    } catch {
      showToast("Could not cancel that scheduled send.", "error");
    }
  };

  const handleRunDue = async () => {
    try {
      const res = await runDue.mutateAsync();
      if (res.processed === 0) {
        showToast("No scheduled sends are due yet.", "info");
      } else {
        showToast(
          `Dispatched ${res.processed}: ${res.sent} sent, ${res.failed} failed.`,
          res.failed > 0 ? "error" : "success",
        );
      }
    } catch {
      showToast("Could not run due sends.", "error");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-[#323288] focus:outline-none focus:ring-1 focus:ring-[#323288]";
  const sectionTitle = "text-sm font-semibold text-gray-900 dark:text-white";

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const todayStr = now().toFormat("yyyy-MM-dd");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compose email</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {props.contextLabel} · {selectedCount} of {recipients.length} selected
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChosen}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />

        {scheduleConfirmed ? (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Scheduled ✓</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Your email to {selectedCount} {selectedCount === 1 ? "person" : "people"} is queued.
                It will go out within about 15 minutes of {scheduleDate} {scheduleTime}.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setScheduleConfirmed(false)}
                className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-lg bg-[#323288] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3da3]"
              >
                Done
              </button>
            </div>
          </div>
        ) : result ? (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Sent {result.sent} of {result.total}
              </p>
              {result.failed > 0 ? (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  <p>{result.failed} failed:</p>
                  <p className="break-words">{result.failures.join(", ")}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  All emails sent successfully.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={props.onClose}
                className="rounded-lg bg-[#323288] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3da3]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={sectionTitle}>Recipients</span>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  Send to all
                </label>
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
                {recipients.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-400">No recipients available.</p>
                ) : (
                  recipients.map((recipient) => {
                    const checked = selectedIds.has(recipient.id);
                    const name = recipient.firstName ? recipient.firstName : "";
                    return (
                      <label
                        key={recipient.id}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(recipient.id)}
                        />
                        <span className="flex-1 text-gray-900 dark:text-gray-200 truncate">
                          {name} <span className="text-gray-500">{recipient.email}</span>
                        </span>
                        {recipient.device ? (
                          <span className="rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                            {recipient.device}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                            device unknown
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <span className={sectionTitle}>Link environment</span>
              <div className="mt-2 flex gap-3">
                {(["prod", "test"] as const).map((env) => (
                  <label
                    key={env}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="radio"
                      name="orbit-outreach-env"
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                    />
                    {env === "prod" ? "Production" : "Test"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={sectionTitle} htmlFor="orbit-outreach-subject">
                Subject
              </label>
              <input
                id="orbit-outreach-subject"
                className={`${inputClass} mt-1`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className={sectionTitle} htmlFor="orbit-outreach-body">
                Message
              </label>
              <textarea
                id="orbit-outreach-body"
                rows={6}
                className={`${inputClass} mt-1`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message. An 'Open Annix Orbit' button is added automatically."
              />
            </div>

            <div className="space-y-2">
              <span className={sectionTitle}>Attachments</span>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeDeviceGuide}
                  onChange={(e) => setIncludeDeviceGuide(e.target.checked)}
                />
                Attach the matching device install guide (both as links if device unknown)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeFbwGuide}
                  onChange={(e) => setIncludeFbwGuide(e.target.checked)}
                />
                Attach the Feedback Widget guide
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <span className={sectionTitle}>Manage guides &amp; attachments</span>
              {GUIDE_SLOTS.map((guide) => {
                const asset = assets.find((a) => a.slot === guide.slot);
                const busy = uploadSlot === guide.slot;
                return (
                  <div key={guide.slot} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-gray-200">{guide.label}</p>
                      <p className="truncate text-xs text-gray-500">
                        {asset
                          ? `${asset.originalFilename} (${formatBytes(asset.fileSize)})`
                          : "Not uploaded"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerUpload(guide.slot)}
                      disabled={busy}
                      className="shrink-0 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-50"
                    >
                      {busy ? "Uploading…" : asset ? "Replace" : "Upload"}
                    </button>
                  </div>
                );
              })}

              <div className="border-t border-gray-100 dark:border-slate-700 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Extra attachments
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerUpload("extra")}
                    disabled={uploadSlot === "extra"}
                    className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-50"
                  >
                    {uploadSlot === "extra" ? "Uploading…" : "Add file"}
                  </button>
                </div>
                {extras.length === 0 ? (
                  <p className="text-xs text-gray-400">None</p>
                ) : (
                  extras.map((asset) => {
                    const checked = selectedExtraIds.includes(asset.id);
                    return (
                      <div key={asset.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExtra(asset.id)}
                        />
                        <span className="flex-1 truncate text-gray-900 dark:text-gray-200">
                          {asset.label ? asset.label : asset.originalFilename}
                          <span className="ml-1 text-xs text-gray-500">
                            ({formatBytes(asset.fileSize)})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
              <span className={sectionTitle}>Orbit Seeker access</span>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={provisionAccount}
                  onChange={(e) => setProvisionAccount(e.target.checked)}
                />
                Create an Annix Orbit Seeker account for each recipient at this tier
              </label>
              {provisionAccount ? (
                <div className="space-y-1">
                  <select
                    className={inputClass}
                    value={provisionTier}
                    onChange={(e) => setProvisionTier(e.target.value)}
                    aria-label="Orbit Seeker tier"
                  >
                    <option value="">Select a tier…</option>
                    {tierPlans.map((plan) => (
                      <option key={plan.tier} value={plan.tier}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400">
                    Module: Annix Orbit Seeker. The "Open Annix Orbit" button becomes each
                    recipient's account set-up link (set a password, then straight into Orbit).
                    Skips anyone who already has an Orbit account.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <span className={sectionTitle}>When</span>
              <div className="flex gap-4">
                {(["now", "schedule"] as const).map((mode) => (
                  <label
                    key={mode}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="radio"
                      name="orbit-outreach-when"
                      checked={sendMode === mode}
                      onChange={() => setSendMode(mode)}
                    />
                    {mode === "now" ? "Send now" : "Schedule for later"}
                  </label>
                ))}
              </div>
              {sendMode === "schedule" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <DateInput
                      value={scheduleDate}
                      onChange={setScheduleDate}
                      min={todayStr}
                      ariaLabel="Schedule date"
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      aria-label="Schedule time"
                      className={inputClass}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Sends go out within about 15 minutes of the chosen time (SAST).
                  </p>
                </div>
              ) : null}
            </div>

            {pendingSchedules.length > 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={sectionTitle}>Scheduled sends</span>
                  <button
                    type="button"
                    onClick={handleRunDue}
                    disabled={runDue.isPending}
                    className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 disabled:opacity-50"
                    title="Send any scheduled emails whose time has passed (for testing without waiting for the cron)"
                  >
                    {runDue.isPending ? "Running…" : "Run due now"}
                  </button>
                </div>
                {pendingSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex-1 truncate text-gray-900 dark:text-gray-200">
                      {schedule.subject}
                      <span className="ml-1 text-xs text-gray-500">
                        · {schedule.recipientCount} recipients ·{" "}
                        {fromISO(schedule.scheduledAt).toFormat("yyyy/MM/dd HH:mm")}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelSchedule(schedule.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {sending ? (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-[#323288] transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-center text-xs text-gray-500">
                  Sending {progress.done} of {progress.total}…
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={props.onClose}
                disabled={sending || scheduling}
                className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendMode === "schedule" ? handleSchedule : handleSend}
                disabled={sending || scheduling || selectedCount === 0}
                className="rounded-lg bg-[#323288] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d3da3] disabled:opacity-50"
              >
                {sendMode === "schedule"
                  ? scheduling
                    ? "Scheduling…"
                    : `Schedule for ${selectedCount}`
                  : sending
                    ? "Sending…"
                    : `Send to ${selectedCount}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
