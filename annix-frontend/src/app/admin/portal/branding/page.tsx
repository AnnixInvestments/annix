"use client";

import Link from "next/link";
import { brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";

const MASTER_BRAND = {
  code: "annix-investments",
  title: "Annix Investments",
  subtitle: "The master Annix brand. Every app inherits these elements unless it overrides them.",
};

interface BrandLink {
  code: string;
  title: string;
  description: string;
}

const APP_BRANDS: BrandLink[] = [
  {
    code: "annix-forge",
    title: "Annix Forge",
    description: "Industrial project execution — quote, build, inspect, deliver.",
  },
  {
    code: "annix-orbit",
    title: "Annix Orbit",
    description: "Hiring, talent growth and compliance.",
  },
  {
    code: "annix-rep",
    title: "Annix Pulse",
    description: "Mobile sales assistant with smart prospecting and route planning.",
  },
  {
    code: "annix-sentinel",
    title: "Annix Sentinel",
    description: "AI-powered compliance and risk intelligence.",
  },
  {
    code: "annix-insights",
    title: "Annix Insights",
    description: "Market data, news signals and AI-driven portfolio insights.",
  },
];

function BrandLogo(props: { code: string }) {
  const brandingQuery = useBranding(props.code);
  const brandingData = brandingQuery.data;
  const branding = brandingData || brandingFallback(props.code);
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);
  return (
    <div
      className="w-12 h-12 rounded-xl bg-contain bg-center bg-no-repeat flex-shrink-0 bg-gray-900"
      style={{ backgroundImage: `url('${logoIcon}')` }}
    />
  );
}

export default function BrandCenterPage() {
  return (
    <div className="space-y-8">
      <Link href={`/admin/portal/branding/${MASTER_BRAND.code}`} className="group block">
        <div className="bg-gradient-to-r from-[#323288] to-[#4a4da3] rounded-xl p-6 text-white flex items-center gap-4 hover:shadow-lg transition-all">
          <BrandLogo code={MASTER_BRAND.code} />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-blue-200 mb-1">Master brand</p>
            <h1 className="text-2xl font-bold mb-1">{MASTER_BRAND.title}</h1>
            <p className="text-blue-100">{MASTER_BRAND.subtitle}</p>
          </div>
          <span className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-white/15 text-sm font-medium whitespace-nowrap group-hover:bg-white/25 transition-colors">
            Edit master brand →
          </span>
        </div>
      </Link>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">App brands</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Each app inherits the master brand unless it overrides a field. Edit any app's logo,
          colours and identity here.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {APP_BRANDS.map((brandLink) => (
            <Link
              key={brandLink.code}
              href={`/admin/portal/branding/${brandLink.code}`}
              className="group"
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border-2 border-transparent hover:border-violet-400 hover:shadow-lg transition-all duration-300 h-full flex items-start gap-4">
                <BrandLogo code={brandLink.code} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {brandLink.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {brandLink.description}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
