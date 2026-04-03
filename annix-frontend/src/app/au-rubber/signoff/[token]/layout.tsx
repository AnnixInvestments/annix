import type { ReactNode } from "react";

export default function SignOffLayout(props: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            AU Rubber - Account Sign-Off
          </h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto py-8 px-4">{props.children}</main>
    </div>
  );
}
