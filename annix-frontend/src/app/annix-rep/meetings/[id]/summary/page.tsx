"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { MeetingSummary, Sentiment } from "@/app/lib/api/annixRepApi";
import { useMeeting, useSendSummary, useSummaryPreview } from "@/app/lib/query/hooks";

function sentimentBadge(sentiment: Sentiment | null) {
  if (!sentiment) return null;

  const styles: Record<Sentiment, { bg: string; text: string; icon: string }> = {
    positive: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    neutral: {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    negative: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      icon: "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  };

  const style = styles[sentiment];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
      </svg>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Tone
    </span>
  );
}

function SummaryPreviewCard({
  summary,
  meeting,
}: {
  summary: MeetingSummary;
  meeting: {
    title: string;
    date: string;
    duration: string;
    attendees: string[];
    companyName: string | null;
  };
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6">
        <h2 className="text-xl font-bold">{meeting.title}</h2>
        {meeting.companyName && <p className="text-blue-100 mt-1">{meeting.companyName}</p>}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-blue-100">
          <span>{meeting.date}</span>
          <span>{meeting.duration}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Meeting Summary
          </h3>
          {sentimentBadge(summary.sentiment)}
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overview</h4>
          <p className="text-gray-600 dark:text-gray-400">{summary.overview}</p>
        </div>

        {summary.topics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topics Discussed
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {summary.keyPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key Points
            </h4>
            <ul className="space-y-2">
              {summary.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
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
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.actionItems.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
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
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Action Items ({summary.actionItems.length})
            </h4>
            <ul className="space-y-3">
              {summary.actionItems.map((item, i) => (
                <li key={i} className="text-sm">
                  <div className="text-gray-700 dark:text-gray-300 font-medium">{item.task}</div>
                  {item.assignee && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      Assigned to: {item.assignee}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.nextSteps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Next Steps
            </h4>
            <ul className="space-y-2">
              {summary.nextSteps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SummaryPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = Number(params.id);

  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [includeTranscriptLink, setIncludeTranscriptLink] = useState(true);
  const [sendResult, setSendResult] = useState<{ sent: string[]; failed: string[] } | null>(null);

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useSummaryPreview(meetingId);
  const sendSummary = useSendSummary();

  const isLoading = meetingLoading || previewLoading;

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email?.includes("@") && !recipientEmails.includes(email)) {
      setRecipientEmails([...recipientEmails, email]);
      setEmailInput("");
    }
  };

  const removeEmail = (email: string) => {
    setRecipientEmails(recipientEmails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSend = async () => {
    if (recipientEmails.length === 0) return;

    const result = await sendSummary.mutateAsync({
      meetingId,
      dto: {
        recipientEmails,
        includeTranscriptLink,
      },
    });

    setSendResult(result);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Meeting not found</p>
        <Link href="/annix-rep/meetings" className="mt-4 text-blue-600 hover:underline">
          Back to meetings
        </Link>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/annix-rep/meetings/${meetingId}`}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Summary</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Cannot Generate Summary
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This meeting needs a recording and transcript before a summary can be generated.
          </p>
          <Link
            href={`/annix-rep/meetings/${meetingId}/transcript`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Transcript
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/annix-rep/meetings/${meetingId}`}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Summary</h1>
          <p className="text-gray-500 dark:text-gray-400">{meeting.title}</p>
        </div>
      </div>

      {sendResult ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <div className="text-center mb-6">
            {sendResult.failed.length === 0 ? (
              <>
                <svg
                  className="w-16 h-16 mx-auto text-green-500 mb-4"
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
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Summary Sent Successfully
                </h2>
              </>
            ) : (
              <>
                <svg
                  className="w-16 h-16 mx-auto text-yellow-500 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Partial Success
                </h2>
              </>
            )}
          </div>

          {sendResult.sent.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                Sent to:
              </h3>
              <ul className="space-y-1">
                {sendResult.sent.map((email) => (
                  <li
                    key={email}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sendResult.failed.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                Failed to send:
              </h3>
              <ul className="space-y-1">
                {sendResult.failed.map((email) => (
                  <li
                    key={email}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setSendResult(null)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Send to More Recipients
            </button>
            <Link
              href={`/annix-rep/meetings/${meetingId}`}
              className="flex-1 px-4 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Back to Meeting
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {preview && <SummaryPreviewCard summary={preview.summary} meeting={preview.meeting} />}
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Send Summary
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Recipients
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={addEmail}
                      className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    >
                      Add
                    </button>
                  </div>

                  {recipientEmails.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recipientEmails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-md"
                        >
                          {email}
                          <button
                            onClick={() => removeEmail(email)}
                            className="hover:text-blue-900 dark:hover:text-blue-100"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeTranscriptLink}
                    onChange={(e) => setIncludeTranscriptLink(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Include link to full transcript
                  </span>
                </label>

                <button
                  onClick={handleSend}
                  disabled={recipientEmails.length === 0 || sendSummary.isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendSummary.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Sending...
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
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                      </svg>
                      Send Summary ({recipientEmails.length})
                    </>
                  )}
                </button>
              </div>
            </div>

            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Meeting Attendees
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Click to add as recipient
                </p>
                <div className="space-y-1">
                  {meeting.attendees.map((attendee, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (!recipientEmails.includes(attendee)) {
                          setRecipientEmails([...recipientEmails, attendee]);
                        }
                      }}
                      disabled={recipientEmails.includes(attendee)}
                      className="w-full text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {attendee}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
