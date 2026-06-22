"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BOILER_CONTROL_DOC, BOILER_CONTROL_DOC_LAST_UPDATED } from "./boilerControlDoc";

export default function BoilerControlDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Boiler Control Documentation
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Reconstructed sequence of operations and I/O schedule for the steam boiler LOGO!
          controller. Admin reference. Last updated {BOILER_CONTROL_DOC_LAST_UPDATED}.
        </p>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-table:text-sm prose-blockquote:border-l-[var(--sc-primary,#323288)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{BOILER_CONTROL_DOC}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
