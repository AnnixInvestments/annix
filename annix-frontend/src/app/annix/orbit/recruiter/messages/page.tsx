"use client";

import { useEffect, useState } from "react";
import {
  useExtractionProgress,
  withExtractionProgress,
} from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import {
  useOrbitDraftMessage,
  useOrbitSendMessage,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";

interface Template {
  key: string;
  label: string;
  subject: string;
  build: (candidateName: string, role: string) => string;
}

const TEMPLATES: Template[] = [
  {
    key: "request_documents",
    label: "Request documents",
    subject: "Documents needed for your application",
    build: (name) =>
      `Hi ${name || "there"},\n\nThanks for your interest. To move forward, could you please send through your outstanding documents (ID, qualifications and contactable references)?\n\nOnce we have these we can progress your application.\n\nKind regards`,
  },
  {
    key: "invite_interview",
    label: "Invite to interview",
    subject: "Interview invitation",
    build: (name, role) =>
      `Hi ${name || "there"},\n\nGood news — we'd like to invite you to an interview${role ? ` for the ${role} role` : ""}. Please let me know a few times that suit you over the next few days.\n\nLooking forward to it.\n\nKind regards`,
  },
  {
    key: "send_shortlist",
    label: "Send shortlist (client)",
    subject: "Shortlist for your vacancy",
    build: (_name, role) =>
      `Hi,\n\nPlease find our shortlist of candidates${role ? ` for the ${role} role` : ""}. Each has been screened against your requirements.\n\nHappy to arrange interviews at your convenience.\n\nKind regards`,
  },
  {
    key: "follow_up",
    label: "Follow up",
    subject: "Quick follow-up",
    build: (name) =>
      `Hi ${name || "there"},\n\nJust following up on my previous message — let me know if you have any questions or need anything further from me.\n\nKind regards`,
  },
  {
    key: "polite_reject",
    label: "Polite rejection",
    subject: "Update on your application",
    build: (name, role) =>
      `Hi ${name || "there"},\n\nThank you for your interest${role ? ` in the ${role} role` : ""} and for the time you invested. On this occasion we won't be taking your application further, but we'd love to keep you in mind for future opportunities.\n\nWishing you all the best.\n\nKind regards`,
  },
];

export default function RecruiterMessagesPage() {
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const draftMutation = useOrbitDraftMessage();
  const sendMutation = useOrbitSendMessage();
  const { showToast } = useToast();

  const firstTemplate = TEMPLATES[0];
  const [templateKey, setTemplateKey] = useState(firstTemplate.key);
  const [candidateName, setCandidateName] = useState("");
  const [to, setTo] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState(firstTemplate.subject);
  const [body, setBody] = useState("");

  const isDrafting = draftMutation.isPending;
  const extractionProgress = useExtractionProgress();
  const [draftEstimateMs, setDraftEstimateMs] = useState(10_000);
  useEffect(() => {
    annixOrbitApiClient
      .recruiterExtractEstimates()
      .then((result) => {
        if (result.messageDraftMs > 0) setDraftEstimateMs(result.messageDraftMs);
      })
      .catch(() => {});
  }, []);
  const isSending = sendMutation.isPending;

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.build(candidateName, role));
    }
  };

  const onPickCandidate = (value: string) => {
    if (!value) {
      setCandidateName("");
      return;
    }
    const found = candidates.find((c) => c.id === Number(value));
    if (found) {
      setCandidateName(found.fullName);
      if (found.email) setTo(found.email);
    }
  };

  const fillFromTemplate = () => {
    const tpl = TEMPLATES.find((t) => t.key === templateKey);
    if (tpl) setBody(tpl.build(candidateName, role));
  };

  const draftWithAi = async () => {
    try {
      const result = await withExtractionProgress(
        extractionProgress,
        {
          brand: "annix-orbit",
          label: "Nix is drafting the message…",
          estimatedDurationMs: draftEstimateMs,
        },
        () =>
          draftMutation.mutateAsync({
            templateKey,
            candidateName: candidateName.trim() || null,
            role: role.trim() || null,
            notes: notes.trim() || null,
          }),
      );
      setBody(result.body);
      showToast("Draft ready — review before sending.", "success");
    } catch {
      showToast("Could not draft the message. Please try again.", "error");
    }
  };

  const sendEmail = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      showToast("Recipient, subject and message are all required.", "error");
      return;
    }
    try {
      const result = await sendMutation.mutateAsync({
        to: to.trim(),
        subject: subject.trim(),
        body,
      });
      if (result.simulated) {
        showToast("Send simulated (non-production) — no email was actually sent.", "info");
      } else if (result.sent) {
        showToast("Email sent.", "success");
      } else {
        showToast("The email could not be sent.", "error");
      }
    } catch {
      showToast("Could not send the email. Please try again.", "error");
    }
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      showToast("Message copied.", "success");
    } catch {
      showToast("Could not copy to clipboard.", "error");
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(body)}`;
  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Messages</h1>
        <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
          Compose from a template or draft with AI, then send by email or open in WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label htmlFor="ms-template" className="block text-sm font-medium text-gray-700 mb-1">
              Template
            </label>
            <select
              id="ms-template"
              value={templateKey}
              onChange={(e) => applyTemplate(e.target.value)}
              className={`${inputClasses} bg-white`}
            >
              {TEMPLATES.map((tpl) => (
                <option key={tpl.key} value={tpl.key}>
                  {tpl.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ms-candidate" className="block text-sm font-medium text-gray-700 mb-1">
              Candidate (optional)
            </label>
            <select
              id="ms-candidate"
              onChange={(e) => onPickCandidate(e.target.value)}
              className={`${inputClasses} bg-white`}
              defaultValue=""
            >
              <option value="">Not linked</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={String(candidate.id)}>
                  {candidate.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ms-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role (optional)
            </label>
            <input
              id="ms-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClasses}
              placeholder="Sales Manager"
            />
          </div>

          <div>
            <label htmlFor="ms-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes for AI (optional)
            </label>
            <textarea
              id="ms-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputClasses}
              placeholder="Anything the message should mention."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fillFromTemplate}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Use template
            </button>
            <button
              type="button"
              onClick={draftWithAi}
              disabled={isDrafting}
              className="flex-1 px-3 py-2 bg-[#323288] text-white rounded-lg text-sm font-medium hover:bg-[#252560] disabled:opacity-50"
            >
              {isDrafting ? "Drafting…" : "Draft with AI"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <label htmlFor="ms-to" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient email
            </label>
            <input
              id="ms-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClasses}
              placeholder="candidate@example.com"
            />
          </div>

          <div>
            <label htmlFor="ms-subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              id="ms-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="ms-body" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="ms-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className={inputClasses}
              placeholder="Pick a template or draft with AI, then edit here."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={sendEmail}
              disabled={isSending}
              className="px-4 py-2 bg-[#323288] text-white rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50"
            >
              {isSending ? "Sending…" : "Send email"}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Open in WhatsApp
            </a>
            <button
              type="button"
              onClick={copyBody}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Emails only send for real in production; in other environments the send is simulated so
            no candidate is contacted by accident.
          </p>
        </div>
      </div>
    </div>
  );
}
