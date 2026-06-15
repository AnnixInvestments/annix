"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { fromISO } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  marketingAdminApi,
  type NewsletterCampaign,
  type NewsletterSubscriber,
} from "@/app/lib/marketing/api";

function StatCard(props: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {props.label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{props.value}</div>
    </div>
  );
}

function campaignStatusClass(status: string): string {
  if (status === "sent") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function downloadSubscribersCsv(rows: NewsletterSubscriber[]) {
  const header = "Email,Status,Source,Subscribed\n";
  const body = rows
    .map((row) => {
      const rowSource = row.source;
      const source = rowSource ?? "";
      return `${row.email},${row.status},${source},${row.createdAt}`;
    })
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "annix-newsletter-subscribers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function NewsletterAdminPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const statsQuery = useQuery({
    queryKey: ["marketing", "newsletter", "stats"],
    queryFn: () => marketingAdminApi.newsletterStats(),
  });
  const subscribersQuery = useQuery({
    queryKey: ["marketing", "newsletter", "subscribers"],
    queryFn: () => marketingAdminApi.newsletterSubscribers(),
  });
  const campaignsQuery = useQuery({
    queryKey: ["marketing", "newsletter", "campaigns"],
    queryFn: () => marketingAdminApi.newsletterCampaigns(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["marketing", "newsletter"] });
  };

  const sendMutation = useMutation({
    mutationFn: () => marketingAdminApi.sendNewsletter(subject, body),
    onSuccess: (campaign) => {
      showToast(`Sent to ${campaign.sentCount} subscriber(s).`, "success");
      setSubject("");
      setBody("");
      invalidate();
    },
    onError: () => showToast("Could not send the newsletter.", "error"),
  });

  const scheduleMutation = useMutation({
    mutationFn: () => marketingAdminApi.scheduleNewsletter(subject, body, scheduledAt),
    onSuccess: () => {
      showToast("Newsletter scheduled.", "success");
      setSubject("");
      setBody("");
      setScheduledAt("");
      invalidate();
    },
    onError: () => showToast("Could not schedule the newsletter.", "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => marketingAdminApi.cancelNewsletterCampaign(id),
    onSuccess: () => {
      showToast("Scheduled newsletter cancelled.", "success");
      invalidate();
    },
  });

  const stats = statsQuery.data;
  const subscribersData = subscribersQuery.data;
  const subscribers = subscribersData ?? [];
  const campaignsData = campaignsQuery.data;
  const campaigns = campaignsData ?? [];
  const canCompose = subject.trim().length > 0 && body.trim().length > 0;
  const sendPending = sendMutation.isPending;
  const schedulePending = scheduleMutation.isPending;
  const sending = sendPending || schedulePending;

  async function handleSendNow() {
    const subscribedCount = stats ? stats.subscribed : 0;
    const ok = await confirm({
      title: "Send newsletter now?",
      message: `This will email all ${subscribedCount} active subscriber(s) immediately.`,
      confirmLabel: "Send now",
      variant: "warning",
    });
    if (ok) {
      sendMutation.mutate();
    }
  }

  function handleSchedule() {
    if (scheduledAt.length === 0) {
      showToast("Pick a date and time to schedule.", "error");
      return;
    }
    scheduleMutation.mutate();
  }

  async function handleCancel(campaign: NewsletterCampaign) {
    const ok = await confirm({
      title: "Cancel scheduled newsletter?",
      message: `"${campaign.subject}" will not be sent.`,
      confirmLabel: "Cancel send",
      variant: "danger",
    });
    if (ok) {
      cancelMutation.mutate(campaign.id);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {ConfirmDialog}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/portal/marketing" className="text-sm text-[#323288] hover:underline">
            ← Marketing site
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Newsletter</h1>
        </div>
        <button
          type="button"
          onClick={() => downloadSubscribersCsv(subscribers)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Subscribers" value={stats ? stats.subscribed : "—"} />
        <StatCard label="Unsubscribed" value={stats ? stats.unsubscribed : "—"} />
        <StatCard label="New today" value={stats ? stats.today : "—"} />
        <StatCard label="New this week" value={stats ? stats.thisWeek : "—"} />
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Compose newsletter</h2>
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject"
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your newsletter… (blank lines start new paragraphs)"
          rows={10}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canCompose || sending}
            onClick={handleSendNow}
            className="rounded-lg bg-[#323288] px-5 py-2 text-sm font-semibold text-white hover:bg-[#28286e] disabled:opacity-50"
          >
            {sendMutation.isPending ? "Sending…" : "Send now"}
          </button>
          <span className="text-sm text-gray-400">or schedule:</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#323288] focus:outline-none"
          />
          <button
            type="button"
            disabled={!canCompose || sending || scheduledAt.length === 0}
            onClick={handleSchedule}
            className="rounded-lg border border-[#323288] px-5 py-2 text-sm font-semibold text-[#323288] hover:bg-[#323288]/5 disabled:opacity-50"
          >
            {scheduleMutation.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-500">No newsletters sent or scheduled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Sent / Failed</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const cScheduledAt = campaign.scheduledAt;
                  const cSentAt = campaign.sentAt;
                  const when = cScheduledAt ?? cSentAt ?? campaign.createdAt;
                  return (
                    <tr key={campaign.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{campaign.subject}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${campaignStatusClass(campaign.status)}`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {when ? fromISO(when).toFormat("dd MMM yyyy, HH:mm") : "—"}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {campaign.sentCount} / {campaign.failedCount}
                      </td>
                      <td className="py-2 text-right">
                        {campaign.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleCancel(campaign)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Subscribers ({subscribers.length})
        </h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => {
                const subSource = sub.source;
                return (
                  <tr key={sub.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{sub.email}</td>
                    <td className="py-2 pr-4 text-gray-600">{sub.status}</td>
                    <td className="py-2 pr-4 text-gray-600">{subSource ?? "—"}</td>
                    <td className="py-2 text-gray-600">
                      {sub.createdAt ? fromISO(sub.createdAt).toFormat("dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
