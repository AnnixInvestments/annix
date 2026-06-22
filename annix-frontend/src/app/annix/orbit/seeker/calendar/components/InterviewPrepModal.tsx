"use client";

import { createPortal } from "react-dom";
import type { InterviewPrepPack } from "@/app/lib/api/annixOrbitApi";

export function InterviewPrepModal(props: {
  isOpen: boolean;
  onClose: () => void;
  roleTitle: string;
  pack: InterviewPrepPack | null;
}) {
  const isOpen = props.isOpen;
  const pack = props.pack;
  if (!isOpen || !pack) return null;

  const onClose = props.onClose;
  const roleTitle = props.roleTitle;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-[var(--brand-accent,#FF8A00)]/30 bg-[var(--brand-navbar,#1a1a3a)] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-accent,#FF8A00)]">
              Nix interview prep
            </p>
            <h2 className="mt-1 text-lg font-bold">{roleTitle}</h2>
            <p className="mt-1 text-sm text-white/70">{pack.roleSummary}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5">
          <PrepSection title="Likely questions">
            <ul className="space-y-3">
              {pack.likelyQuestions.map((item, index) => (
                <li
                  key={`${index}-${item.question}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="font-medium text-white">{item.question}</p>
                  <p className="mt-1 text-sm text-white/70">{item.whyAsked}</p>
                </li>
              ))}
            </ul>
          </PrepSection>

          <PrepSection title="STAR talking points (from your CV)">
            <ul className="space-y-3">
              {pack.starTalkingPoints.map((point, index) => (
                <li
                  key={`${index}-${point.competency}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="font-semibold text-[var(--brand-accent,#FF8A00)]">
                    {point.competency}
                  </p>
                  <p className="mt-1 text-sm italic text-white/70">{point.prompt}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/85">
                    {point.pointers.map((pointer, index) => (
                      <li key={`${index}-${pointer}`}>{pointer}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </PrepSection>

          {pack.gapsToBridge.length > 0 ? (
            <PrepSection title="Gaps to bridge">
              <PrepList items={pack.gapsToBridge} />
            </PrepSection>
          ) : null}

          {pack.companyContext.length > 0 ? (
            <PrepSection title="Company & role talking points">
              <PrepList items={pack.companyContext} />
            </PrepSection>
          ) : null}

          {pack.questionsToAsk.length > 0 ? (
            <PrepSection title="Smart questions to ask">
              <PrepList items={pack.questionsToAsk} />
            </PrepSection>
          ) : null}

          {pack.logistics.length > 0 ? (
            <PrepSection title="On the day">
              <PrepList items={pack.logistics} />
            </PrepSection>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--brand-accent,#FF8A00)] px-4 py-2.5 font-semibold text-[var(--brand-navbar,#1a1a3a)] hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PrepSection(props: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/80">
        {props.title}
      </h3>
      {props.children}
    </section>
  );
}

function PrepList(props: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-white/85">
      {props.items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}
