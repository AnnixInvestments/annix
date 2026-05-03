"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { CvEmailTemplate, CvEmailTemplateKind } from "@/app/lib/api/cvAssistantApi";
import {
  useCvEmailTemplates,
  useCvNixDraftEmailTemplate,
  useCvResetEmailTemplate,
  useCvUpdateEmailTemplate,
} from "@/app/lib/query/hooks";

const PREVIEW_VARS: Record<string, string> = {
  candidateName: "Thandi Mabaso",
  jobTitle: "External Sales Representative (Rubber Products)",
  companyName: "AU Industries",
  jobReference: "JOB-2X4SUB",
  responseTimelineDays: "14",
  referenceName: "Pieter Botha",
  feedbackLink: "https://example.com/cv-assistant/reference-feedback/abc123",
};

const renderPreview = (template: string): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    const value = PREVIEW_VARS[key as string];
    return value !== undefined ? value : match;
  });

export default function EmailTemplatesSettingsPage() {
  const { data: templates, isLoading } = useCvEmailTemplates();
  const [activeKind, setActiveKind] = useState<CvEmailTemplateKind | null>(null);

  useEffect(() => {
    if (templates && templates.length > 0 && activeKind === null) {
      setActiveKind(templates[0].kind);
    }
  }, [templates, activeKind]);

  if (isLoading || !templates) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  const active = templates.find((t) => t.kind === activeKind) ?? templates[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Email templates</h1>
        <p className="text-white/70 mt-1 text-sm">
          Customise the candidate-facing emails that go out on rejection, shortlist, acceptance,
          reference requests and application acknowledgement. Use{" "}
          <code className="bg-white/10 px-1 rounded">{"{{candidateName}}"}</code> placeholders —
          they're substituted at send time.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {templates.map((tpl) => (
          <button
            key={tpl.kind}
            type="button"
            onClick={() => setActiveKind(tpl.kind)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tpl.kind === active.kind
                ? "bg-[#FFA500] text-[#1a1a40]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {tpl.label}
            {tpl.isCustomised ? (
              <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">edited</span>
            ) : null}
          </button>
        ))}
      </div>

      <TemplateEditor key={active.kind} template={active} />
    </div>
  );
}

interface TemplateEditorProps {
  template: CvEmailTemplate;
}

function TemplateEditor({ template }: TemplateEditorProps) {
  const { showToast } = useToast();
  const updateMutation = useCvUpdateEmailTemplate();
  const resetMutation = useCvResetEmailTemplate();
  const nixDraftMutation = useCvNixDraftEmailTemplate();

  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [bodyText, setBodyText] = useState(template.bodyText);
  const [instructions, setInstructions] = useState("");

  const originalSubject = template.subject;
  const originalBodyHtml = template.bodyHtml;
  const originalBodyText = template.bodyText;
  const dirty =
    subject !== originalSubject || bodyHtml !== originalBodyHtml || bodyText !== originalBodyText;

  const handleSave = () => {
    updateMutation.mutate(
      { kind: template.kind, subject, bodyHtml, bodyText },
      {
        onSuccess: () => showToast("Template saved.", "success"),
        onError: () => showToast("Couldn't save template. Try again.", "error"),
      },
    );
  };

  const handleReset = () => {
    resetMutation.mutate(template.kind, {
      onSuccess: (data) => {
        setSubject(data.subject);
        setBodyHtml(data.bodyHtml);
        setBodyText(data.bodyText);
        showToast("Reset to default.", "success");
      },
      onError: () => showToast("Couldn't reset template. Try again.", "error"),
    });
  };

  const handleNixDraft = () => {
    nixDraftMutation.mutate(
      { kind: template.kind, instructions: instructions.trim() || undefined },
      {
        onSuccess: (data) => {
          setSubject(data.subject);
          setBodyHtml(data.bodyHtml);
          setBodyText(data.bodyText);
          showToast("Nix drafted a new version. Review and save when ready.", "success");
        },
        onError: () => showToast("Nix couldn't draft right now. Try again.", "error"),
      },
    );
  };

  const placeholders = template.placeholders;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#1a1a40]">{template.label}</h2>
          <p className="text-sm text-gray-600 mt-0.5">{template.description}</p>
          {placeholders.length > 0 ? (
            <p className="text-xs text-gray-500 mt-2">
              Placeholders:{" "}
              {placeholders.map((p) => (
                <code key={p} className="bg-gray-100 px-1 rounded mr-1">{`{{${p}}}`}</code>
              ))}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="email-subject" className="text-sm font-semibold text-[#1a1a40]">
            Subject
          </label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={240}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#252560] focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email-body-html" className="text-sm font-semibold text-[#1a1a40]">
            Body (HTML)
          </label>
          <textarea
            id="email-body-html"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#252560] focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email-body-text" className="text-sm font-semibold text-[#1a1a40]">
            Body (plain text fallback)
          </label>
          <textarea
            id="email-body-text"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#252560] focus:border-transparent"
          />
        </div>

        <div className="rounded-lg border border-[#FFA500]/40 bg-[#FFA500]/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-[#1a1a40]">Draft with Nix</p>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder="Optional: extra guidance for Nix (e.g. 'warmer tone', 'mention our hybrid policy')"
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs"
          />
          <button
            type="button"
            onClick={handleNixDraft}
            disabled={nixDraftMutation.isPending}
            className="text-xs px-3 py-1.5 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50"
          >
            {nixDraftMutation.isPending ? "Nix is drafting…" : "Generate with Nix"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
            className="px-4 py-2 bg-[#252560] text-white text-sm font-semibold rounded-lg hover:bg-[#1a1a40] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </button>
          {template.isCustomised ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="px-4 py-2 bg-white border border-red-300 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
            >
              {resetMutation.isPending ? "Resetting…" : "Reset to default"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#1a1a40]">Preview</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Placeholders are filled with sample values so you can see how the email will read.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-xs text-gray-500">Subject</p>
            <p className="text-sm font-semibold text-[#1a1a40] mt-0.5">{renderPreview(subject)}</p>
          </div>
          <div
            className="px-4 py-4 text-sm text-gray-800 leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendering the user's own template preview
            dangerouslySetInnerHTML={{ __html: renderPreview(bodyHtml) }}
          />
        </div>

        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold">Plain text fallback</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans bg-gray-50 p-3 rounded border border-gray-200">
            {renderPreview(bodyText)}
          </pre>
        </details>
      </div>
    </div>
  );
}
