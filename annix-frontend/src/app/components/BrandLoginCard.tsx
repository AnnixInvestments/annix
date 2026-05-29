"use client";

import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { useBranding } from "@/app/lib/query/hooks";
import { useTheme } from "./ThemeProvider";

// Renders the per-app "login card" marketing image from branding, following the
// active theme (dark card on dark surfaces, light on light; dark falls back to
// light when only one is uploaded). Renders nothing when no card is set, so a
// login screen without a card is unaffected.
export function BrandLoginCard(props: { brand: string; className?: string }) {
  const { brand, className } = props;
  const query = useBranding(brand);
  const data = query.data;
  const branding = data ?? null;
  const { resolvedTheme } = useTheme();
  const variant = resolvedTheme === "light" ? "light" : "dark";

  if (!branding) return null;
  const hasCard =
    brandHasAsset("loginCard", branding, "light") || brandHasAsset("loginCard", branding, "dark");
  if (!hasCard) return null;

  const url = resolveBrandAssetUrl("loginCard", branding, variant);
  return <img src={url} alt="" className={className || "w-full rounded-2xl shadow-xl"} />;
}
