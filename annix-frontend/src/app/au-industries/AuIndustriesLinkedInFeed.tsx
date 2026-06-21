"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRelative } from "@/app/lib/datetime";
import { useAuIndustriesLinkedInFeed } from "@/app/lib/query/hooks";

const ROTATE_INTERVAL_MS = 6000;
const COMPANY_NAME = "AU Industries (Pty) Ltd";

function LinkedInIcon(props: { className?: string }): React.JSX.Element {
  const { className } = props;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className ?? ""}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function ElfsightFallback(): React.JSX.Element {
  return (
    <div className="elfsight-app-4c13c174-7edd-4de9-b428-dc35d38ec263" data-elfsight-app-lazy />
  );
}

export function AuIndustriesLinkedInFeed(): React.JSX.Element {
  const feed = useAuIndustriesLinkedInFeed();
  const { data } = feed;
  const posts = data ?? [];
  const count = posts.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) {
        return;
      }
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) {
      return;
    }
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    if (index > count - 1) {
      setIndex(0);
    }
  }, [index, count]);

  if (count === 0) {
    return <ElfsightFallback />;
  }

  const active = posts[index];
  const relative = formatRelative(active.publishedAtISO);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-3xl md:text-4xl font-bold text-white uppercase tracking-wider mb-2">
        AU Industries LinkedIn Feed
      </h2>
      <div className="w-24 h-[3px] bg-[#efcc54] mx-auto mt-3 mb-4" />
      <p className="text-center text-gray-200 text-lg mb-10">
        Keep up to date with all the AU news, past and present.
      </p>
      <div
        className="relative overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8A6608] text-sm font-bold text-white">
            AU
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{COMPANY_NAME}</p>
            {relative ? <p className="text-xs text-gray-500">{relative}</p> : null}
          </div>
          <a
            href={active.permalink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on LinkedIn"
            className="text-[#0A66C2] transition-opacity hover:opacity-80"
          >
            <LinkedInIcon className="h-6 w-6" />
          </a>
        </div>

        {active.text ? (
          <p className="whitespace-pre-line px-5 pb-4 text-sm leading-relaxed text-gray-800 line-clamp-4">
            {active.text}
          </p>
        ) : null}

        {active.imageUrl ? (
          <a href={active.permalink} target="_blank" rel="noopener noreferrer">
            <img
              src={active.imageUrl}
              alt=""
              className="max-h-[28rem] w-full bg-gray-50 object-contain"
              loading="lazy"
            />
          </a>
        ) : null}

        <div className="flex items-center justify-between px-5 py-3">
          <a
            href={active.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#8A6608] hover:text-[#6E5106]"
          >
            View on LinkedIn
          </a>
          {count > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous post"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next post"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {posts.map((post, dotIndex) => (
            <button
              key={post.id}
              type="button"
              onClick={() => goTo(dotIndex)}
              aria-label={`Go to post ${dotIndex + 1}`}
              className={
                dotIndex === index
                  ? "h-2.5 w-6 rounded-full bg-[#efcc54] transition-all"
                  : "h-2.5 w-2.5 rounded-full bg-white/50 transition-all hover:bg-white/80"
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
