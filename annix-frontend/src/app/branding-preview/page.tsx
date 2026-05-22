import type { Metadata } from "next";
import { AnnixOrbitIcon } from "@/app/components/branding/AnnixOrbitIcon";
import { AnnixOrbitLogo } from "@/app/components/branding/AnnixOrbitLogo";
import { AnnixOrbitNavbar } from "@/app/components/branding/AnnixOrbitNavbar";
import {
  ANNIX_BG_GRADIENT,
  ANNIX_FONT_BODY,
  ANNIX_FONT_DISPLAY,
  ANNIX_PALETTE,
} from "@/app/components/branding/tokens";
import { AnnixOrbitCard } from "@/app/components/cards/AnnixOrbitCard";

export const metadata: Metadata = {
  title: "Annix Orbit — Brand Preview",
  description: "Canonical Annix Orbit brand assets reference page.",
};

/**
 * Internal brand-preview page — every Annix Orbit asset surfaced in one
 * place so designers + engineers can QA the canonical against the
 * implementation. Not linked from any production page; reach it at
 * /branding-preview when you need to vet the brand kit.
 */
export default function BrandingPreviewPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0a1130", color: ANNIX_PALETTE.white }}>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <header>
          <h1
            className="text-4xl font-extrabold mb-2"
            style={{ fontFamily: ANNIX_FONT_DISPLAY, letterSpacing: "0.04em" }}
          >
            Annix Orbit — Brand Preview
          </h1>
          <p className="text-sm opacity-80 max-w-2xl" style={{ fontFamily: ANNIX_FONT_BODY }}>
            Canonical brand assets. The reference image is the source of truth — this page mirrors
            it in code so you can vet exact proportions, colours, typography and spacing.
          </p>
        </header>

        {/* ─── Palette ──────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Palette</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <Swatch label="Primary Navy" hex="#001B8F" />
            <Swatch label="Dark Navy" hex="#00135F" />
            <Swatch label="Orange" hex="#FF8A00" />
            <Swatch label="Glow Orange" hex="#FFA500" />
            <Swatch label="White" hex="#FFFFFF" textOnBlack />
            <Swatch label="White 80%" hex="rgba(255,255,255,0.80)" textOnBlack />
          </div>
        </section>

        {/* ─── Typography ──────────────────────────────────────────── */}
        <section>
          <SectionTitle>Typography</SectionTitle>
          <div className="space-y-4 rounded-xl p-6" style={{ background: ANNIX_BG_GRADIENT }}>
            <div
              className="text-6xl"
              style={{
                fontFamily: ANNIX_FONT_DISPLAY,
                fontWeight: 800,
                letterSpacing: "0.12em",
              }}
            >
              ANNIX
            </div>
            <div className="text-xs opacity-70">Exo 2 ExtraBold (800) · #FFFFFF · +12 tracking</div>

            <div
              className="text-5xl"
              style={{
                color: ANNIX_PALETTE.orange,
                fontFamily: ANNIX_FONT_DISPLAY,
                fontWeight: 600,
                letterSpacing: "0.40em",
              }}
            >
              ORBIT
            </div>
            <div className="text-xs opacity-70">Exo 2 SemiBold (600) · #FF8A00 · +10 tracking</div>

            <div
              style={{
                color: ANNIX_PALETTE.white80,
                fontFamily: ANNIX_FONT_BODY,
                fontWeight: 500,
                letterSpacing: "0.30em",
              }}
            >
              HIRING <span style={{ color: ANNIX_PALETTE.orange }}>•</span> TALENT{" "}
              <span style={{ color: ANNIX_PALETTE.orange }}>•</span> COMPLIANCE
            </div>
            <div className="text-xs opacity-70">Inter Medium (500) · white 80%</div>

            <p
              className="max-w-xl"
              style={{ color: ANNIX_PALETTE.white70, fontFamily: ANNIX_FONT_BODY, fontWeight: 400 }}
            >
              The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.
              AI screening, reference checks, and job matching.
            </p>
            <div className="text-xs opacity-70">Inter Regular (400) · white 70%</div>
          </div>
        </section>

        {/* ─── Icon at every size ──────────────────────────────────── */}
        <section>
          <SectionTitle>Icon — sizes</SectionTitle>
          <div
            className="flex flex-wrap items-end gap-8 p-8 rounded-xl"
            style={{ background: ANNIX_BG_GRADIENT }}
          >
            {[16, 24, 32, 48, 64, 96, 128, 192].map((size) => (
              <figure key={size} className="text-center">
                <AnnixOrbitIcon className="mx-auto" style={{ width: size, height: size }} />
                <figcaption className="text-xs mt-2 opacity-70">{size}px</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ─── Favicon + App icon ──────────────────────────────────── */}
        <section>
          <SectionTitle>Favicon &amp; App icon (with backdrop)</SectionTitle>
          <div className="flex flex-wrap items-center gap-8">
            <figure className="text-center">
              <AnnixOrbitIcon withBackground className="w-16 h-16" title="Annix Orbit favicon" />
              <figcaption className="text-xs mt-2 opacity-70">Favicon 64px</figcaption>
            </figure>
            <figure className="text-center">
              <AnnixOrbitIcon withBackground className="w-32 h-32" />
              <figcaption className="text-xs mt-2 opacity-70">App icon 128px</figcaption>
            </figure>
            <figure className="text-center">
              <AnnixOrbitIcon withBackground className="w-48 h-48" />
              <figcaption className="text-xs mt-2 opacity-70">App icon 192px</figcaption>
            </figure>
          </div>
        </section>

        {/* ─── Navbar lockup ───────────────────────────────────────── */}
        <section>
          <SectionTitle>Navbar — horizontal lockup</SectionTitle>
          <div className="space-y-4">
            <div className="rounded-xl p-6" style={{ background: ANNIX_BG_GRADIENT }}>
              <AnnixOrbitNavbar />
            </div>
            <div className="rounded-xl p-6 bg-white text-slate-700">
              <AnnixOrbitNavbar onLight />
            </div>
          </div>
        </section>

        {/* ─── Full logo lockup ────────────────────────────────────── */}
        <section>
          <SectionTitle>Full logo — variants</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <AnnixOrbitLogo variant="onDark" />
              <p className="text-xs opacity-70 mt-2 text-center">onDark (default)</p>
            </div>
            <div>
              <AnnixOrbitLogo variant="onLight" />
              <p className="text-xs opacity-70 mt-2 text-center">onLight</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1a1f4a]">
              <AnnixOrbitLogo variant="transparent" />
              <p className="text-xs opacity-70 mt-2 text-center">transparent</p>
            </div>
          </div>
        </section>

        {/* ─── Card lockup ─────────────────────────────────────────── */}
        <section>
          <SectionTitle>Card lockup (Annix Hub launcher)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AnnixOrbitCard variant="dark" ctaHref="/annix/orbit" className="h-full" />
            <AnnixOrbitCard variant="light" ctaHref="/annix/orbit" className="h-full" />
          </div>
        </section>

        {/* ─── Loading screen ──────────────────────────────────────── */}
        <section>
          <SectionTitle>Loading screen</SectionTitle>
          <div
            className="rounded-xl flex flex-col items-center justify-center py-20"
            style={{ background: ANNIX_BG_GRADIENT }}
          >
            <AnnixOrbitIcon className="w-32 h-32 animate-pulse" />
            <div
              className="mt-6 text-lg"
              style={{
                color: ANNIX_PALETTE.white80,
                fontFamily: ANNIX_FONT_DISPLAY,
                fontWeight: 600,
                letterSpacing: "0.18em",
              }}
            >
              LOADING…
            </div>
          </div>
        </section>

        {/* ─── Raw asset links ─────────────────────────────────────── */}
        <section>
          <SectionTitle>Raw SVG files</SectionTitle>
          <ul className="space-y-1 text-sm" style={{ color: ANNIX_PALETTE.orangeLight }}>
            <li>
              <a href="/branding/annix-orbit-logo.svg" target="_blank" rel="noreferrer">
                /branding/annix-orbit-logo.svg
              </a>
            </li>
            <li>
              <a href="/branding/annix-orbit-logo-dark.svg" target="_blank" rel="noreferrer">
                /branding/annix-orbit-logo-dark.svg
              </a>
            </li>
            <li>
              <a href="/branding/annix-orbit-logo-light.svg" target="_blank" rel="noreferrer">
                /branding/annix-orbit-logo-light.svg
              </a>
            </li>
            <li>
              <a href="/branding/annix-orbit-icon.svg" target="_blank" rel="noreferrer">
                /branding/annix-orbit-icon.svg
              </a>
            </li>
            <li>
              <a href="/branding/annix-orbit-favicon.svg" target="_blank" rel="noreferrer">
                /branding/annix-orbit-favicon.svg
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xl font-bold mb-4 pb-2 border-b border-white/10"
      style={{ fontFamily: ANNIX_FONT_DISPLAY, letterSpacing: "0.06em" }}
    >
      {children}
    </h2>
  );
}

function Swatch({
  label,
  hex,
  textOnBlack = false,
}: {
  label: string;
  hex: string;
  textOnBlack?: boolean;
}) {
  return (
    <div className="rounded-lg overflow-hidden shadow">
      <div
        className="h-20"
        style={{ background: hex, border: "1px solid rgba(255,255,255,0.08)" }}
      />
      <div
        className="px-3 py-2 text-xs"
        style={{ background: textOnBlack ? "#0a1130" : "rgba(255,255,255,0.06)" }}
      >
        <div className="font-semibold">{label}</div>
        <div className="opacity-70 font-mono">{hex}</div>
      </div>
    </div>
  );
}
