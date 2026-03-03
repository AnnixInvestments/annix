"use client";

import Link from "next/link";

export function LiteHeader() {
  return (
    <header className="bg-teal-700 text-white px-4 py-3 shadow-md">
      <div className="flex items-center justify-between">
        <Link href="/stock-control/lite" className="text-xl font-bold">
          Stock Control
        </Link>
        <span className="text-sm opacity-75">Lite Mode</span>
      </div>
    </header>
  );
}
