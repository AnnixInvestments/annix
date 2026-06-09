"use client";

import Link from "next/link";
import { useIsTestEnv } from "@/app/lib/hooks/useIsTestEnv";

export function BackToHubLink() {
  const isTestEnv = useIsTestEnv();
  if (isTestEnv) return null;
  return (
    <Link
      href="/annix/orbit"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#3a3a8a] hover:text-[#1a1a4e] dark:text-[#c0c0eb] dark:hover:text-white"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Orbit hub
    </Link>
  );
}
