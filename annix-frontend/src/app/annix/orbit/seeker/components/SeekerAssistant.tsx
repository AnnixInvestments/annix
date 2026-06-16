"use client";

import { isString } from "es-toolkit/compat";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  SeekerAssistantAction,
  SeekerAssistantChatTurn,
  SeekerAssistantContext,
} from "@/app/lib/api/annixOrbitApi";
import { useOrbitMyProfileStatus, useOrbitSeekerAssistantChat } from "@/app/lib/query/hooks";
import { SeekerWalkthroughRunner } from "./SeekerWalkthroughRunner";
import { type SeekerWalkthroughStep, seekerWalkthrough } from "./seekerWalkthroughs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Walk me through applying for a job",
  "Help me finish my profile",
  "How do I book an interview?",
  "What does the dashboard show me?",
];

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "Profile",
  jobs: "Browse Jobs",
  applications: "Applications",
  calendar: "Interviews",
  plans: "Plans",
  "how-to": "Help",
  settings: "Settings",
};

function currentPageLabel(pathname: string): string | undefined {
  const match = pathname.match(/\/seeker\/([^/]+)/);
  const segment = match ? match[1] : "";
  return PAGE_LABELS[segment];
}

function actionToSteps(action: SeekerAssistantAction): SeekerWalkthroughStep[] {
  const walkthroughKey = action.walkthrough;
  if (walkthroughKey) {
    const predefined = seekerWalkthrough(walkthroughKey);
    if (predefined) {
      return predefined.steps;
    }
  }
  const explicit = action.steps;
  const raw =
    explicit && explicit.length > 0
      ? explicit
      : [{ route: action.route, target: action.target, label: action.label }];
  return raw
    .filter((entry) => isString(entry.target) && entry.target !== "")
    .map(
      (entry): SeekerWalkthroughStep => ({
        kind: "instruction",
        title: "Nix",
        body: entry.label ? entry.label : "Here's where to go next.",
        target: entry.target as string,
        route: entry.route,
      }),
    );
}

export function SeekerAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [walkthroughSteps, setWalkthroughSteps] = useState<SeekerWalkthroughStep[] | null>(null);
  const [tourId, setTourId] = useState(0);
  const chat = useOrbitSeekerAssistantChat();
  const profileStatusQuery = useOrbitMyProfileStatus(open);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pending = chat.isPending;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, pending]);

  function buildContext(): SeekerAssistantContext {
    const status = profileStatusQuery.data;
    const context: SeekerAssistantContext = { currentPage: currentPageLabel(pathname) };
    if (status) {
      context.hasCv = status.hasCv;
      context.onboardingComplete = status.onboardingComplete;
      context.qualificationsCount = status.qualificationsCount;
      context.certificatesCount = status.certificatesCount;
    }
    return context;
  }

  function startTour(action: SeekerAssistantAction) {
    const steps = actionToSteps(action);
    if (steps.length === 0) {
      const route = action.route;
      if (route) {
        router.push(route);
      }
      return;
    }
    if (action.walkthrough) {
      setOpen(false);
    }
    setTourId((prev) => prev + 1);
    setWalkthroughSteps(steps);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed === "" || pending) {
      return;
    }
    const history: SeekerAssistantChatTurn[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    try {
      const result = await chat.mutateAsync({ message: trimmed, history, context: buildContext() });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      const action = result.action;
      if (action) {
        startTour(action);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — I couldn't answer just then. Please try again in a moment.",
        },
      ]);
    }
  }

  const overlay = walkthroughSteps ? (
    <SeekerWalkthroughRunner
      key={tourId}
      steps={walkthroughSteps}
      onComplete={() => setWalkthroughSteps(null)}
    />
  ) : null;

  if (!open) {
    return (
      <>
        {overlay}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask Nix"
          className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            N
          </span>
          Ask Nix
        </button>
      </>
    );
  }

  return (
    <>
      {overlay}
      <div className="fixed bottom-5 right-5 z-[9998] flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-4 py-3 text-white"
          style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-base font-bold"
              style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
            >
              N
            </span>
            <div>
              <div className="text-sm font-semibold">Nix</div>
              <div className="text-xs text-white/70">Your job-search helper</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                Hi! I'm Nix. I can help you find jobs, build your profile, track applications and
                interviews, and find your way around. What would you like to do?
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition hover:border-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar,#323288)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm text-white"
                    : "prose prose-sm max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                }
                style={
                  message.role === "user"
                    ? { backgroundColor: "var(--brand-navbar, #323288)" }
                    : undefined
                }
              >
                {message.role === "user" ? (
                  message.content
                ) : (
                  <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                )}
              </div>
            </div>
          ))}

          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask Nix about your job search…"
            className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-navbar,#323288)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || input.trim() === ""}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}
