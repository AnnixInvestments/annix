import type { SignalSnapshotResponse } from "@/app/lib/api/insightsApi";
import { ScoreBar } from "./ScoreBar";

interface SignalBreakdownProps {
  signal: SignalSnapshotResponse;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function fmtNumber(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(2);
}

export function SignalBreakdown(props: SignalBreakdownProps) {
  const sig = props.signal;
  const b = sig.componentBreakdown;
  const missingDimensions = b.inputsMissing;

  return (
    <div className="space-y-3 text-sm bg-gray-900/40 border border-gray-800 rounded-xl p-4">
      <Row label="Momentum (20d ROC + 50d SMA crossover)" score={sig.momentumScore}>
        <span className="text-gray-500">
          ROC {fmtPct(b.momentum.roc20)} · SMA {fmtPct(b.momentum.smaCrossover)}
        </span>
      </Row>
      <Row label="Valuation (P/E vs 5y median)" score={sig.valuationScore}>
        <span className="text-gray-500">
          P/E {fmtNumber(b.valuation.trailingPe)} · median {fmtNumber(b.valuation.medianPe)}
        </span>
      </Row>
      <Row label="News sentiment" score={sig.newsSentimentScore}>
        <span className="text-gray-500">source: {b.newsSentiment.source}</span>
      </Row>
      <Row label="Sector trend (20d ETF ROC)" score={sig.sectorTrendScore}>
        {(() => {
          const sectorRaw = b.sectorTrend.sector;
          const sectorText = sectorRaw ?? "no sector";
          const etfRaw = b.sectorTrend.etf;
          const etfText = etfRaw ?? "—";
          return (
            <span className="text-gray-500">
              {sectorText} · ETF {etfText}
              {b.sectorTrend.etfRoc20 !== null ? ` · ${fmtPct(b.sectorTrend.etfRoc20)}` : ""}
            </span>
          );
        })()}
      </Row>
      <Row
        label="Drawdown risk (distance from 52w high)"
        score={sig.drawdownRiskScore}
        variant="risk"
      >
        <span className="text-gray-500">
          peak {fmtNumber(b.drawdownRisk.weekHigh52)} ·{" "}
          {b.drawdownRisk.distanceFromHighPct.toFixed(2)}% below
        </span>
      </Row>
      {missingDimensions.length > 0 ? (
        <p className="text-xs text-yellow-400 pt-2 border-t border-gray-800">
          Stubbed dimensions: {missingDimensions.join(", ")} — confidence ceiling is{" "}
          {80 - missingDimensions.length * 10}.
        </p>
      ) : null}
    </div>
  );
}

interface RowProps {
  label: string;
  score: number;
  variant?: "opportunity" | "risk" | "confidence" | "neutral";
  children?: React.ReactNode;
}

function Row(props: RowProps) {
  const propsVariant = props.variant;
  const variant = propsVariant ?? "neutral";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-300 text-xs">{props.label}</span>
        {props.children}
      </div>
      <ScoreBar value={props.score} variant={variant} />
    </div>
  );
}
