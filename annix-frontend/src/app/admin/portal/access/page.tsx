"use client";

import Link from "next/link";
import { ACCESS_APPS } from "@/app/lib/access/accessApps";

export default function AccessIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Access & plans</h1>
      <p className="mt-1 text-sm text-gray-500">
        Per-app subscription tiers, trial invites, and promo codes. Pick an app to manage its plans.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESS_APPS.map((app) => (
          <Link
            key={app.moduleKey}
            href={`/admin/portal/access/${app.moduleKey}`}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <h2 className="font-semibold text-gray-900">{app.name}</h2>
            <p className="mt-1 text-xs text-gray-500">{app.moduleKey}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
