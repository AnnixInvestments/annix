"use client";

import Link from "next/link";

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
  backHref: string;
}

export function ModuleHeader(props: ModuleHeaderProps) {
  const { title, subtitle, backHref } = props;
  return (
    <div className="flex items-center gap-4">
      <Link
        href={backHref}
        className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        <svg
          className="h-5 w-5 text-gray-600 dark:text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}
