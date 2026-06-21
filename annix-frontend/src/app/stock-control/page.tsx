import {
  ArrowRight,
  ClipboardList,
  FileBarChart,
  FlaskConical,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ASCA Stock Control — Inventory, Job Cards, QC & Data Books",
  description:
    "ASCA Stock Control runs the floor: job cards, stock allocation, deliveries, QC, customer purchase orders, and AI-assisted document extraction in one place.",
};

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Job Cards & Allocations",
    body: "Track every job from RFQ to dispatch. Allocate stock, generate PDFs, and push delivery notes to Sage automatically.",
  },
  {
    icon: Package,
    title: "Stock & Inventory",
    body: "Multi-location SOH, FIFO batch tracking, automatic reorder alerts, supplier price history, and full movement audit.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Control",
    body: "Customer-approved QCPs, Defelsko/PosiTector batch capture, calibration certificates, and data book compilation.",
  },
  {
    icon: Truck,
    title: "Deliveries & Dispatch",
    body: "Photo capture, signature capture, customer-facing dispatch links, and reconciliation against supplier invoices.",
  },
  {
    icon: FileBarChart,
    title: "Customer Purchase Orders",
    body: "CPO line-item tracking, call-off scheduling, fulfilment reports, and over-allocation approvals.",
  },
  {
    icon: FlaskConical,
    title: "Sage Integration",
    body: "Two-way Sage One/Cloud sync — JC dumps, invoice matching, supplier reconciliation, and DLA-compliant rate-limiting.",
  },
];

export default function StockControlLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[var(--sc-primary-active,#1c1c48)] to-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sc-primary,#323288)]/15 px-3 py-1 text-xs font-medium text-[var(--sc-primary-200,#adadcf)] ring-1 ring-inset ring-[var(--sc-primary-400,#5b5b9c)]/30">
            <Sparkles className="h-3.5 w-3.5" />
            Now with AI-assisted document extraction
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            ASCA Stock Control
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--sc-primary-100,#d6d6e9)]/90">
            Built for industrial fabricators. Run job cards, stock, QC, deliveries, customer
            purchase orders, and your data books from one place — with Sage, Nix AI, and your QCPs
            wired in.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/stock-control/demo"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
            >
              Try the demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/stock-control/register"
              className="inline-flex items-center rounded-md bg-[var(--sc-primary,#323288)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--sc-primary-400,#5b5b9c)]"
            >
              Sign up free
            </Link>
            <Link
              href="/stock-control/login"
              className="inline-flex items-center rounded-md px-5 py-2.5 text-sm font-semibold text-[var(--sc-primary-100,#d6d6e9)] ring-1 ring-inset ring-[var(--sc-primary-300,#8484b5)]/30 hover:bg-white/5"
            >
              Existing customer? Log in
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl bg-white/5 p-6 ring-1 ring-inset ring-white/10 backdrop-blur-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--sc-primary,#323288)]/15 text-[var(--sc-primary-300,#8484b5)] ring-1 ring-inset ring-[var(--sc-primary-400,#5b5b9c)]/30">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--sc-primary-100,#d6d6e9)]/80">
                  {feature.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 rounded-2xl bg-white/5 p-8 ring-1 ring-inset ring-white/10 sm:p-12">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                See it before you sign up
              </h2>
              <p className="mt-3 text-base text-[var(--sc-primary-100,#d6d6e9)]/80">
                The demo shows a real job-cards view, populated with sample data so you can click
                around without an account. No card, no email — just a look.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Link
                href="/stock-control/demo"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--sc-primary,#323288)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--sc-primary-400,#5b5b9c)]"
              >
                Open the demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-[var(--sc-primary-200,#adadcf)]/60">
          Part of the Annix platform · ASCA, AU Rubber, RFQ, Annix Sentinel, FieldFlow, Annix Orbit.
        </p>
      </div>
    </div>
  );
}
