"use client";

import {
  useOrbitClients,
  useOrbitPlacements,
  useOrbitSubmissions,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";

function formatRand(value: number): string {
  return `R${value.toLocaleString("en-ZA")}`;
}

function percent(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default function RecruiterReportsPage() {
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const { data: submissions = [] } = useOrbitSubmissions();
  const { data: placements = [] } = useOrbitPlacements();
  const { data: clients = [] } = useOrbitClients();

  const consentedCount = candidates.filter((c) => c.consentToShare).length;

  const interviewStatuses = ["interview", "offer", "placed"];
  const offerStatuses = ["offer", "placed"];
  const submittedCount = submissions.length;
  const interviewCount = submissions.filter((s) => interviewStatuses.includes(s.status)).length;
  const offerCount = submissions.filter((s) => offerStatuses.includes(s.status)).length;
  const placedCount = submissions.filter((s) => s.status === "placed").length;

  const totalFees = placements.reduce((sum, p) => {
    const fee = p.placementFee;
    return fee === null ? sum : sum + fee;
  }, 0);

  const activeClients = clients.filter((c) => c.status === "active").length;

  const kpis: { label: string; value: string; hint: string }[] = [
    { label: "Candidates", value: String(candidates.length), hint: "In your talent database" },
    {
      label: "Consent coverage",
      value: percent(consentedCount, candidates.length),
      hint: `${consentedCount} can be submitted`,
    },
    { label: "Clients", value: String(clients.length), hint: `${activeClients} active` },
    { label: "Submissions", value: String(submittedCount), hint: "Sent to clients" },
    { label: "Placements", value: String(placements.length), hint: "Recorded to date" },
    { label: "Fees earned/pipeline", value: formatRand(totalFees), hint: "Sum of placement fees" },
  ];

  const funnel: { label: string; count: number; rate: string }[] = [
    { label: "Submitted", count: submittedCount, rate: "100%" },
    { label: "Interview", count: interviewCount, rate: percent(interviewCount, submittedCount) },
    { label: "Offer", count: offerCount, rate: percent(offerCount, submittedCount) },
    { label: "Placed", count: placedCount, rate: percent(placedCount, submittedCount) },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Reports</h1>
        <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
          Performance and database health across your agency's pipeline.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-[#c0c0eb]">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#323288] dark:text-white">{kpi.value}</p>
            <p className="mt-1 text-xs text-gray-400">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-[#0A1B3D] dark:text-white">
          Submission → placement funnel
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#c0c0eb]">
          Conversion of submissions through to placement.
        </p>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {funnel.map((stage) => (
            <div
              key={stage.label}
              className="rounded-xl border border-[#e0e0f5] bg-[#f0f0fc]/40 dark:bg-white/5 p-4 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#323288] dark:text-[#9ea0e8]">
                {stage.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stage.count}</p>
              <p className="mt-1 text-xs text-gray-400">{stage.rate}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-[#c0c0eb]">
          Time-to-placement, per-recruiter performance and agency rollups arrive as interviews and
          the recruiter team model ship.
        </p>
      </div>
    </div>
  );
}
