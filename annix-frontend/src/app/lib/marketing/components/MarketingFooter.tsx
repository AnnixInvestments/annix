import type { MarketingFooter as MarketingFooterContent } from "@annix/product-data/marketing";
import Link from "next/link";
import { MARKETING_VERSION } from "@/app/config/marketing/version";
import { now } from "@/app/lib/datetime";

export function MarketingFooter(props: { footer: MarketingFooterContent }) {
  const footer = props.footer;
  const year = now().year;
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-4 py-12 text-white/70 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <div
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--brand-font-display)" }}
            >
              Annix
              <span style={{ color: "var(--brand-accent)" }}>.</span>
            </div>
            <p className="mt-3 text-sm tracking-wide text-white/50">{footer.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {footer.columns.map((column) => (
              <div key={column.heading}>
                <div className="mb-3 text-sm font-semibold text-white">{column.heading}</div>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/60 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <span>
            © {year} Annix Investments. {footer.legal}
          </span>
          <span>v{MARKETING_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
