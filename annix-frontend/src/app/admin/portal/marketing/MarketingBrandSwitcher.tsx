"use client";

import Link from "next/link";

type MarketingBrand = "annix" | "au";

interface MarketingBrandSwitcherProps {
  active: MarketingBrand;
}

const BRAND_OPTIONS: { key: MarketingBrand; label: string; href: string }[] = [
  { key: "annix", label: "Annix", href: "/admin/portal/marketing" },
  { key: "au", label: "AU", href: "/admin/portal/marketing/au" },
];

export function MarketingBrandSwitcher(props: MarketingBrandSwitcherProps) {
  const active = props.active;
  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
      {BRAND_OPTIONS.map((option) => {
        const isActive = option.key === active;
        return (
          <Link
            key={option.key}
            href={option.href}
            className={
              isActive
                ? "rounded-md bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            }
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
