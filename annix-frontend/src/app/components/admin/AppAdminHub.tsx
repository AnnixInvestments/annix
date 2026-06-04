"use client";

import Link from "next/link";
import { brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";

export interface AppHubCard {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  badge?: number | null;
}

function AppHubCardLink(props: { card: AppHubCard }) {
  const card = props.card;
  const borderClass = card.hoverColor.split(" ")[0];
  const iconHoverClass = card.hoverColor.split(" ").slice(1).join(" ");
  const cardBadge = card.badge;
  const showBadge = typeof cardBadge === "number" && cardBadge > 0;
  return (
    <Link href={card.href} className="group">
      <div
        className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border-2 border-transparent ${borderClass} hover:shadow-lg transition-all duration-300 h-full`}
      >
        {showBadge ? (
          <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold">
            {cardBadge}
          </span>
        ) : null}
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${card.color} ${iconHoverClass} transition-colors`}
          >
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{card.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{card.description}</p>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function HubLogo(props: { appKey: string }) {
  const brandingQuery = useBranding(props.appKey);
  const brandingData = brandingQuery.data;
  const branding = brandingData || brandingFallback(props.appKey);
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);
  return (
    <div
      className="w-12 h-12 rounded-xl bg-contain bg-center bg-no-repeat flex-shrink-0"
      style={{ backgroundImage: `url('${logoIcon}')` }}
    />
  );
}

export function AppAdminHub(props: {
  appKey: string;
  title: string;
  subtitle: string;
  cards: AppHubCard[];
}) {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#323288] to-[#4a4da3] rounded-xl p-6 text-white flex items-center gap-4">
        <HubLogo appKey={props.appKey} />
        <div>
          <h1 className="text-2xl font-bold mb-1">{props.title}</h1>
          <p className="text-blue-100">{props.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {props.cards.map((card) => (
          <AppHubCardLink key={card.href} card={card} />
        ))}
      </div>
    </div>
  );
}
