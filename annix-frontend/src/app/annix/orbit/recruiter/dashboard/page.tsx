"use client";

import { useOrbitClients, useOrbitPlacements } from "@/app/lib/query/hooks";

const PIPELINE_STAGES = [
  "Sourced",
  "Screened",
  "Shortlisted",
  "Submitted",
  "Interview",
  "Offer",
  "Placed",
];

function formatRand(value: number): string {
  return `R${value.toLocaleString("en-ZA")}`;
}

export default function RecruiterDashboardPage() {
  const { data: clients = [] } = useOrbitClients();
  const { data: placements = [] } = useOrbitPlacements();

  const revenuePipeline = placements.reduce((sum, p) => {
    const fee = p.placementFee;
    return fee === null ? sum : sum + fee;
  }, 0);

  const cards: { label: string; value: string; hint: string }[] = [
    { label: "Clients", value: String(clients.length), hint: "Companies you place into" },
    { label: "Active Jobs", value: "—", hint: "Vacancies you're working" },
    { label: "Candidates", value: "—", hint: "In your talent database" },
    { label: "New Matches", value: "—", hint: "AI-found this week" },
    { label: "Shortlisted", value: "—", hint: "Ready to submit" },
    { label: "Submissions", value: "—", hint: "Sent to clients" },
    { label: "Placements", value: String(placements.length), hint: "Recorded to date" },
    { label: "Revenue Pipeline", value: formatRand(revenuePipeline), hint: "Fees in play" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Recruiter Dashboard</h1>
        <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
          Your command centre — jobs, candidates, submissions and placements at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-[#c0c0eb]">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#323288] dark:text-white">{card.value}</p>
            <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-[#0A1B3D] dark:text-white">Pipeline overview</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#c0c0eb]">
          Candidates move left to right from sourcing through to placement.
        </p>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage}
              className="rounded-xl border border-dashed border-[#c0c0eb] bg-[#f0f0fc]/40 dark:bg-white/5 p-4 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#323288] dark:text-[#9ea0e8]">
                {stage}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-300 dark:text-white/30">0</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-[#c0c0eb]">
          Candidate, matching and submission metrics populate here as those phases ship.
        </p>
      </div>
    </div>
  );
}
