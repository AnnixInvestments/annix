import type { Metadata } from "next";
import Link from "next/link";
import { BrandLoginCard } from "@/app/components/BrandLoginCard";
import { HubBrandWordmark } from "@/app/components/HubBrandWordmark";

export const metadata: Metadata = {
  title: "Annix Investments",
  description:
    "Build • Connect • Innovate • Grow. Creating intelligent platforms that help businesses work smarter, move faster, and grow stronger.",
};

const ANNIX_PILLARS = ["BUILD", "CONNECT", "INNOVATE", "GROW"];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="flex justify-center mb-3">
            <HubBrandWordmark />
          </h1>
          <div
            className="flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm font-semibold tracking-[0.15em] uppercase mb-5"
            style={{ color: "var(--foreground-inverted)" }}
          >
            {ANNIX_PILLARS.map((pillar, index) => (
              <span key={pillar} className="flex items-center gap-2 md:gap-3">
                {index > 0 ? (
                  <span aria-hidden="true" style={{ color: "#FF8A00" }}>
                    •
                  </span>
                ) : null}
                {pillar}
              </span>
            ))}
          </div>
          <p
            className="text-lg md:text-xl font-medium max-w-2xl mx-auto"
            style={{ color: "var(--foreground)" }}
          >
            Creating intelligent platforms that help businesses work smarter, move faster, and grow
            stronger.
          </p>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Link href="/rfq-portal" target="_blank" rel="noopener noreferrer" className="group">
            <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-blue-400 hover:shadow-2xl">
              <BrandLoginCard
                brand="annix-forge"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </Link>

          <Link href="/core" className="group h-full">
            <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-indigo-400 hover:shadow-2xl">
              <BrandLoginCard
                brand="annix-core"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </Link>

          <Link href="/annix-rep/setup" target="_blank" rel="noopener noreferrer" className="group">
            <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-emerald-400 hover:shadow-2xl">
              <BrandLoginCard
                brand="annix-rep"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </Link>

          <Link href="/annix-sentinel" target="_blank" className="group h-full">
            <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-blue-400 hover:shadow-2xl">
              <BrandLoginCard
                brand="annix-sentinel"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </Link>

          <Link
            href="/annix/orbit"
            target="_blank"
            rel="noopener noreferrer"
            className="group h-full"
          >
            <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-indigo-400 hover:shadow-2xl">
              <BrandLoginCard
                brand="annix-orbit"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
