"use client";

import Link from "next/link";
import type { NavItemDef } from "../config/navItems";

interface NavCardProps {
  item: NavItemDef;
  description: string;
}

function NavCard(props: NavCardProps) {
  const { item, description } = props;

  return (
    <Link
      href={item.href}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 min-h-[120px] hover:shadow-lg hover:border-teal-400 dark:hover:border-teal-500 transition-all duration-200 flex flex-col items-center justify-center text-center"
    >
      <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors mb-4">
        <span className="w-6 h-6">{item.icon}</span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {item.label}
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
