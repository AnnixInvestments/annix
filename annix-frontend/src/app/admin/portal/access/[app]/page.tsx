"use client";

import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppTierEditor } from "@/app/components/access/AppTierEditor";
import { PromoCodeManager } from "@/app/components/access/PromoCodeManager";
import { accessAppByModuleKey } from "@/app/lib/access/accessApps";
import { useAdminLicensingCatalog } from "@/app/lib/query/hooks";

function CompanyTiers(props: { moduleKey: string }) {
  const moduleKey = props.moduleKey;
  const catalogQuery = useAdminLicensingCatalog(moduleKey);
  const catalog = catalogQuery.data;
  const isLoading = catalogQuery.isLoading;
  const isError = catalogQuery.isError;

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading tiers…</p>;
  }
  if (isError || !catalog) {
    return <p className="text-sm text-gray-500">Could not load this app's tiers.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {catalog.tiers.map((tier) => (
        <AppTierEditor key={tier.key} moduleKey={moduleKey} tier={tier} />
      ))}
    </div>
  );
}

export default function AppAccessPage() {
  const params = useParams();
  const rawApp = params.app;
  const moduleKey = isString(rawApp) ? rawApp : isArray(rawApp) ? rawApp[0] : "";
  const app = accessAppByModuleKey(moduleKey);

  if (!app) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-gray-600">Unknown app.</p>
      </div>
    );
  }

  const isSeeker = app.subjectType === "orbit-seeker";

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <div>
        <Link href="/admin/portal/global-apps" className="text-sm text-indigo-600 hover:underline">
          ← Apps
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{app.name} — Access & plans</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage this app's subscription tiers, invite users with a free trial, and create promo
          codes. Billing/checkout is enabled later.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Tiers</h2>
        {isSeeker ? (
          <p className="text-sm text-gray-600">
            Seeker tiers (match strictness, max jobs, monthly Nix runs) are managed on the{" "}
            <Link
              href="/admin/portal/orbit/seeker-tiers"
              className="font-medium text-indigo-600 hover:underline"
            >
              Seeker tiers page
            </Link>
            .
          </p>
        ) : (
          <CompanyTiers moduleKey={moduleKey} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Promo codes</h2>
        <PromoCodeManager moduleKey={moduleKey} />
      </section>
    </div>
  );
}
