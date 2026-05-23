"use client";

import Image from "next/image";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { log } from "@/app/lib/logger";

interface AmixLogoProps {
  /** Size variant: 'sm' (32px), 'md' (48px), 'lg' (64px), 'xl' (96px) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show the "Amix" text next to the logo */
  showText?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Use the signature font for text */
  useSignatureFont?: boolean;
  /**
   * Which wordmark to render next to the icon.
   * - "investments" (default): the global "Annix Investments" cursive wordmark.
   * - "orbit": the "Annix Orbit" wordmark — use inside the Annix Orbit app only.
   */
  wordmark?: "investments" | "orbit";
}

const sizeMap = {
  sm: { logo: 32, text: "text-lg" },
  md: { logo: 48, text: "text-2xl" },
  lg: { logo: 64, text: "text-3xl" },
  xl: { logo: 96, text: "text-4xl" },
};

/**
 * Annix App Logo Component (global Annix branding).
 *
 * The icon part is the canonical Annix Orbit orbital-AN mark
 * (`/branding/annix-orbit-icon.png`) — locked in as the global Annix
 * brand mark. Rendered with slight corner rounding so it reads as an
 * app-icon shape rather than a hard-edged photo rectangle.
 *
 * The text part still renders the existing "Annix Investments" cursive
 * wordmark (`/images/annix-text.png`). That part is being redesigned
 * separately and will be updated in its own change.
 *
 * Usage:
 * - <AmixLogo />                 Default medium size with text
 * - <AmixLogo size="lg" />       Large logo with text
 * - <AmixLogo showText={false} /> Icon only
 *
 * All 17 consumers (Navigation, PortalToolbar, RegistrationToolbar,
 * SessionExpiredModal, Comply-SA pages, Nix popups, customer/register)
 * pick up the new icon automatically — no per-call-site changes needed.
 */
export default function AmixLogo(props: AmixLogoProps) {
  const {
    size = "md",
    showText = true,
    className = "",
    useSignatureFont = true,
    wordmark: wordmarkProp,
  } = props;
  const wordmark = wordmarkProp || "investments";
  const { logo: logoSize } = sizeMap[size];

  const brandContext = useBrandingContext();
  const isOrbit = wordmark === "orbit";
  const iconSrc =
    isOrbit && brandContext
      ? resolveBrandAssetUrl("logoIcon", brandContext)
      : "/branding/annix-orbit-icon.png";

  // Match the icon size to the existing flower-icon dimensions so layouts
  // that previously sized around the old icon still look balanced.
  if (showText) {
    const iconSize = logoSize * 1.5;
    const textHeight = 48.4;
    const textWidth = Math.round(textHeight * 2.5);
    const orbitWordmark = brandContext
      ? resolveBrandAssetUrl("wordmark", brandContext)
      : "/branding/annix-orbit-wordmark.png";
    const wordmarkSrc = isOrbit ? orbitWordmark : "/images/annix-text.png";
    const wordmarkAlt = isOrbit ? "Annix Orbit" : "Annix Investments";

    log.debug("AmixLogo rendering inline parts", {
      size,
      logoSize,
      iconSize,
      textWidth,
      textHeight,
      wordmark,
    });

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Image
          src={iconSrc}
          alt="Annix"
          width={iconSize}
          height={iconSize}
          priority
          unoptimized={isOrbit}
          style={{ width: iconSize, height: iconSize, borderRadius: "18%" }}
        />
        <Image
          src={wordmarkSrc}
          alt={wordmarkAlt}
          width={textWidth}
          height={textHeight}
          priority
          unoptimized={isOrbit}
          style={{ width: "auto", height: textHeight }}
        />
      </div>
    );
  }

  log.debug("AmixLogo rendering icon only", { size, logoSize });

  return (
    <div className={`inline-block ${className}`}>
      <Image
        src={iconSrc}
        alt="Annix"
        width={logoSize}
        height={logoSize}
        priority
        unoptimized={isOrbit}
        style={{ width: logoSize, height: logoSize, borderRadius: "18%" }}
      />
    </div>
  );
}

/**
 * Full logo with navy background — for use on light backgrounds.
 */
export function AmixLogoWithBackground(
  props: Omit<AmixLogoProps, "showText" | "useSignatureFont">,
) {
  const { size = "md", className = "" } = props;
  return (
    <div
      className={`inline-flex items-center rounded-lg px-4 py-2 ${className}`}
      style={{ backgroundColor: "#323288" }}
    >
      <AmixLogo size={size} showText useSignatureFont />
    </div>
  );
}
