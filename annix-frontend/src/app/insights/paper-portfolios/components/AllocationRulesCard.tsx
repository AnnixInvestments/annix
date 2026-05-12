import type { PaperAllocationRules } from "@/app/lib/api/insightsApi";

interface AllocationRulesCardProps {
  rules: PaperAllocationRules;
}

function fmtPct(value: number | null): string {
  if (value === null) return "no cap";
  return `${value}%`;
}

function fmtCount(value: number | null): string {
  if (value === null) return "unlimited";
  return value.toString();
}

export function AllocationRulesCard(props: AllocationRulesCardProps) {
  const rules = props.rules;
  const sectorBonus = rules.sectorTilt;
  const fixed = rules.fixedHolding;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
        Allocation rules
      </h3>
      <dl className="text-sm divide-y divide-gray-800">
        <Row label="Max positions" value={fmtCount(rules.maxPositions)} />
        <Row label="Max % per position" value={fmtPct(rules.maxPercentPerPosition)} />
        <Row label="Max % per sector" value={fmtPct(rules.maxPercentPerSector)} />
        <Row label="Cash floor" value={fmtPct(rules.cashFloorPercent)} />
        <Row label="Confidence floor" value={`≥ ${rules.confidenceFloor}`} />
        {rules.preferLeveragedEtfs ? (
          <Row label="Leveraged-ETF preference" value="Yes (TQQQ, SOXL, NUGT, etc.)" />
        ) : null}
        {fixed ? <Row label="Fixed holding" value={fixed.symbol} /> : null}
      </dl>
      {sectorBonus ? (
        <div className="mt-3 text-xs text-gray-400">
          <div className="text-gray-300 mb-1">Sector tilt — score bonus +{sectorBonus.bonus}</div>
          <div className="text-gray-500">{sectorBonus.sectors.join(" · ")}</div>
        </div>
      ) : null}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="py-1.5 flex items-baseline justify-between gap-3">
      <dt className="text-gray-400">{props.label}</dt>
      <dd className="text-gray-100 font-medium">{props.value}</dd>
    </div>
  );
}
