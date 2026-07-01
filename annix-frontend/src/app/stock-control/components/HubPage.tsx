"use client";

import Link from "next/link";
import { useCoreAwareHref } from "@/app/core/portal/lib/coreAwareHref";
import type { NavItemDef } from "../config/navItems";
import { PreviewPill } from "./PreviewPill";

interface NavCardProps {
  item: NavItemDef;
  description: string;
}

function NavCard(props: NavCardProps) {
  const { item, description } = props;
  const coreHref = useCoreAwareHref();

  return (
    <Link
      href={coreHref(item.href)}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 min-h-[120px] hover:shadow-lg hover:border-[var(--sc-primary-400,#5b5b9c)] dark:hover:border-[var(--sc-primary,#323288)] transition-all duration-200 flex flex-col items-center justify-center text-center"
    >
      <div className="w-12 h-12 rounded-full bg-[var(--sc-primary-50,#eeeef6)] dark:bg-[var(--sc-primary-active,#1c1c48)]/30 flex items-center justify-center text-[var(--sc-primary,#323288)] dark:text-[var(--sc-primary-400,#5b5b9c)] group-hover:bg-[var(--sc-primary-100,#d6d6e9)] dark:group-hover:bg-[var(--sc-primary-active,#1c1c48)]/50 transition-colors mb-4">
        <span className="w-6 h-6">{item.icon}</span>
      </div>
      <h3 className="flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {item.label}
        {item.preview && <PreviewPill />}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </Link>
  );
}

interface HubPageProps {
  title: string;
  description: string;
  items: Array<{ item: NavItemDef; description: string }>;
}

export function HubPage(props: HubPageProps) {
  const { title, description, items } = props;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No items available for your role.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((entry) => (
            <NavCard key={entry.item.key} item={entry.item} description={entry.description} />
          ))}
        </div>
      )}
    </div>
  );
}
