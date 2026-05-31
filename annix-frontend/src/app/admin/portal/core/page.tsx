"use client";

import { AppAdminHub, type AppHubCard } from "@/app/components/admin/AppAdminHub";

function RubberIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
      />
    </svg>
  );
}

function StockControlIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function BrandingIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
      />
    </svg>
  );
}

const coreAdminCards: AppHubCard[] = [
  {
    href: "/au-rubber/portal/dashboard",
    title: "AU Rubber",
    description: "Manage rubber lining products, orders, and companies.",
    icon: <RubberIcon />,
    color: "bg-yellow-100 text-yellow-600",
    hoverColor: "hover:border-yellow-400 group-hover:bg-yellow-600 group-hover:text-white",
  },
  {
    href: "/stock-control/portal/admin",
    title: "Stock Control",
    description: "Manage stock items, job allocations, and inventory tracking.",
    icon: <StockControlIcon />,
    color: "bg-teal-100 text-teal-600",
    hoverColor: "hover:border-teal-400 group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    href: "/admin/portal/branding/annix-core",
    title: "Branding",
    description: "Annix Core brand — logo, colours and identity.",
    icon: <BrandingIcon />,
    color: "bg-violet-100 text-violet-600",
    hoverColor: "hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white",
  },
];

export default function CoreAdminHubPage() {
  return (
    <AppAdminHub
      appKey="annix-core"
      title="Annix Core — Admin Hub"
      subtitle="Operations platform — manage AU Rubber, Stock Control, and Core branding."
      cards={coreAdminCards}
    />
  );
}
