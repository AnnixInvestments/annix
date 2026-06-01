"use client";

import { useState } from "react";
import { PromoCodeManager } from "@/app/components/access/PromoCodeManager";
import { ACCESS_APPS } from "@/app/lib/access/accessApps";

export default function AdminPromoCodesPage() {
  const [moduleKey, setModuleKey] = useState(ACCESS_APPS[0].moduleKey);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Promo codes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Create discount, free-period, or free-tier-upgrade codes per app. Codes are redeemed at
        checkout when billing is enabled.
      </p>

      <label className="mt-6 flex max-w-sm flex-col text-sm">
        <span className="text-gray-500">App</span>
        <select
          value={moduleKey}
          onChange={(e) => setModuleKey(e.target.value)}
          className="rounded border px-2 py-1"
        >
          {ACCESS_APPS.map((app) => (
            <option key={app.moduleKey} value={app.moduleKey}>
              {app.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6">
        <PromoCodeManager moduleKey={moduleKey} />
      </div>
    </div>
  );
}
