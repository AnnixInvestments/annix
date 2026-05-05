import { ArrowRight, Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ASCA Stock Control — Demo",
  description:
    "A read-only walkthrough of ASCA Stock Control. Sample job cards, statuses, and quality state — no account required.",
};

interface DemoJobCard {
  jobNumber: string;
  jcNumber: string;
  jobName: string;
  customer: string;
  status: "draft" | "active" | "completed";
  workflow: "Allocation" | "Production" | "QC" | "Dispatch" | "Closed";
  dataBook: "Compiled" | "Stale" | "—";
  certs: number;
  created: string;
}

const DEMO_JOB_CARDS: DemoJobCard[] = [
  {
    jobNumber: "JC-04217",
    jcNumber: "21",
    jobName: "Slurry pump impellers (qty 6)",
    customer: "Example Mining Corp",
    status: "active",
    workflow: "Production",
    dataBook: "—",
    certs: 0,
    created: "12 Mar 2026",
  },
  {
    jobNumber: "JC-04221",
    jcNumber: "22",
    jobName: "Pipe spools – DN150 carbon steel",
    customer: "Test Industrial A",
    status: "active",
    workflow: "QC",
    dataBook: "—",
    certs: 3,
    created: "14 Mar 2026",
  },
  {
    jobNumber: "JC-04230",
    jcNumber: "23",
    jobName: "Tank lining – natural rubber",
    customer: "Sample Plant B",
    status: "active",
    workflow: "Dispatch",
    dataBook: "Compiled",
    certs: 7,
    created: "18 Mar 2026",
  },
  {
    jobNumber: "JC-04244",
    jcNumber: "24",
    jobName: "Cyclone wear plate replacement",
    customer: "Example Beneficiation Co",
    status: "completed",
    workflow: "Closed",
    dataBook: "Compiled",
    certs: 4,
    created: "22 Feb 2026",
  },
  {
    jobNumber: "JC-04251",
    jcNumber: "25",
    jobName: "Coated piping – HDPE liner",
    customer: "Test Mining D",
    status: "draft",
    workflow: "Allocation",
    dataBook: "—",
    certs: 0,
    created: "01 Apr 2026",
  },
  {
    jobNumber: "JC-04258",
    jcNumber: "26",
    jobName: "Structural steel platform mods",
    customer: "Example Engineering Ltd",
    status: "active",
    workflow: "Production",
    dataBook: "Stale",
    certs: 2,
    created: "08 Apr 2026",
  },
];

const STATUS_PILL: Record<DemoJobCard["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-teal-100 text-teal-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const WORKFLOW_PILL = "bg-indigo-50 text-indigo-700";

const DATA_BOOK_PILL: Record<DemoJobCard["dataBook"], string> = {
  Compiled: "bg-green-100 text-green-800",
  Stale: "bg-amber-100 text-amber-800",
  "—": "text-gray-400",
};

export default function StockControlDemoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Job Cards</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Manage job cards and stock allocations
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="inline-flex cursor-not-allowed items-center rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-400">
                Import
              </span>
              <span className="inline-flex cursor-not-allowed items-center rounded-md bg-teal-600/40 px-3 py-1.5 text-sm font-medium text-white">
                + New Job Card
              </span>
            </div>
          </div>

          <div className="border-b border-slate-200 px-5">
            <nav className="-mb-px flex space-x-8">
              {["All", "Draft", "Active", "Completed", "Cancelled"].map((tab, idx) => (
                <span
                  key={tab}
                  className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                    idx === 0
                      ? "border-teal-500 text-teal-600"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {tab}
                </span>
              ))}
            </nav>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Job No.</th>
                  <th className="px-3 py-3 font-medium">JC No.</th>
                  <th className="px-3 py-3 font-medium">Job Name</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Customer</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">Workflow</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">Quality</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {DEMO_JOB_CARDS.map((jc) => (
                  <tr key={jc.jobNumber} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-teal-700">{jc.jobNumber}</td>
                    <td className="px-3 py-3 text-slate-600">{jc.jcNumber}</td>
                    <td className="px-3 py-3 text-slate-900">{jc.jobName}</td>
                    <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{jc.customer}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_PILL[jc.status]}`}
                      >
                        {jc.status}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${WORKFLOW_PILL}`}
                      >
                        {jc.workflow}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        {jc.dataBook === "—" ? (
                          <span className={DATA_BOOK_PILL[jc.dataBook]}>—</span>
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DATA_BOOK_PILL[jc.dataBook]}`}
                          >
                            {jc.dataBook}
                          </span>
                        )}
                        {jc.certs > 0 && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {jc.certs} cert{jc.certs === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-slate-500 md:table-cell">{jc.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <SignupCta />
      </div>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="border-b border-teal-700/40 bg-gradient-to-r from-teal-700 to-teal-800 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          <span className="font-semibold">Demo mode</span>
          <span className="text-teal-100/90">
            — sample data, no account required. Nothing here is saved.
          </span>
        </div>
        <Link
          href="/stock-control/register"
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
        >
          Sign up free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function SignupCta() {
  return (
    <div className="mt-8 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm sm:p-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Like what you see? Run your real jobs in ASCA.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign up takes a minute. Add your company details, invite your team, and start allocating
            stock today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <Link
            href="/stock-control/register"
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Sign up free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/stock-control"
            className="inline-flex items-center rounded-md px-4 py-2.5 text-sm font-semibold text-teal-700 ring-1 ring-inset ring-teal-300 hover:bg-teal-50"
          >
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
