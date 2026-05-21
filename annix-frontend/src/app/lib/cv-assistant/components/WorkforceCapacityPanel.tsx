"use client";

import { TRADE_KEYS, TRADE_LABELS, type TradeKey } from "@annix/product-data/sa-market";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useCvUpsertWorkforceNeed, useCvWorkforceNeed } from "@/app/lib/query/hooks";

interface WorkforceCapacityPanelProps {
  rfqId: number;
}

export function WorkforceCapacityPanel(props: WorkforceCapacityPanelProps) {
  const { rfqId } = props;
  const { showToast } = useToast();
  const query = useCvWorkforceNeed(rfqId);
  const mutation = useCvUpsertWorkforceNeed(rfqId);
  const [editing, setEditing] = useState(false);

  const data = query.data;

  const [draftTrades, setDraftTrades] = useState<TradeKey[]>([]);
  const [draftHeadcount, setDraftHeadcount] = useState<string>("");
  const [draftRadius, setDraftRadius] = useState<string>("");
  const [draftLocation, setDraftLocation] = useState<string>("");

  useEffect(() => {
    if (data) {
      const storedLocation = data.projectLocation;
      setDraftTrades(data.requiredTrades);
      setDraftHeadcount(data.estimatedHeadcount == null ? "" : String(data.estimatedHeadcount));
      setDraftRadius(data.radiusKm == null ? "" : String(data.radiusKm));
      setDraftLocation(storedLocation == null ? "" : storedLocation);
    }
  }, [data]);

  if (query.isLoading) {
    return <PanelShell>Loading workforce capacity…</PanelShell>;
  }
  if (!data) {
    return <PanelShell>Could not load workforce capacity.</PanelShell>;
  }

  const toggleTrade = (k: TradeKey) => {
    if (draftTrades.includes(k)) {
      setDraftTrades(draftTrades.filter((x) => x !== k));
    } else {
      setDraftTrades([...draftTrades, k]);
    }
  };

  const handleSave = () => {
    const headcountNum = draftHeadcount === "" ? null : Number.parseInt(draftHeadcount, 10);
    const radiusNum = draftRadius === "" ? null : Number.parseInt(draftRadius, 10);
    mutation.mutate(
      {
        requiredTrades: draftTrades,
        estimatedHeadcount: Number.isFinite(headcountNum) ? headcountNum : null,
        radiusKm: Number.isFinite(radiusNum) ? radiusNum : null,
        projectLocation: draftLocation.trim() === "" ? null : draftLocation.trim(),
      },
      {
        onSuccess: () => {
          showToast("Workforce capacity updated", "success");
          setEditing(false);
        },
        onError: () => showToast("Could not save workforce capacity", "error"),
      },
    );
  };

  return (
    <PanelShell>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Workforce capacity</h3>
          <p className="text-sm text-gray-600">
            Can we crew this project? Matches candidate trade profiles against the project's
            required trades, radius and site location.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Edit
          </button>
        ) : null}
      </div>

      {editing ? (
        <EditorForm
          draftTrades={draftTrades}
          draftHeadcount={draftHeadcount}
          draftRadius={draftRadius}
          draftLocation={draftLocation}
          isSaving={mutation.isPending}
          onToggleTrade={toggleTrade}
          onChangeHeadcount={setDraftHeadcount}
          onChangeRadius={setDraftRadius}
          onChangeLocation={setDraftLocation}
          onCancel={() => setEditing(false)}
          onSave={handleSave}
        />
      ) : (
        <SummaryView data={data} />
      )}
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-200 rounded-lg shadow p-6">{children}</div>;
}

function SummaryView({
  data,
}: {
  data: import("@/app/lib/api/annixOrbitApi").WorkforceNeedSummary;
}) {
  if (data.reason === "no-required-trades") {
    return (
      <EmptyState message="Add at least one required trade to see candidate supply for this project." />
    );
  }
  if (data.reason === "no-radius") {
    return (
      <EmptyState message="Set a search radius (km) to see candidates near the project site." />
    );
  }
  if (data.reason === "no-project-location") {
    return (
      <EmptyState message="Set the project site location to see candidates within the radius." />
    );
  }

  const counts = data.counts;
  const summaryLine =
    counts.totalMatching === 0
      ? `0 matching candidates within ${data.radiusKm}km of ${data.projectLocation}`
      : `${counts.totalMatching} candidate${counts.totalMatching === 1 ? "" : "s"} within ${data.radiusKm}km, ${counts.withValidMedical} with valid medical, ${counts.withValidMineInduction} with mine induction, ${counts.availableNowOr14d} available now or within 14 days`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700">{summaryLine}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Matching trades" value={counts.totalMatching} />
        <Stat label="Valid medical" value={counts.withValidMedical} />
        <Stat label="Mine induction" value={counts.withValidMineInduction} />
        <Stat label="Available now / 14d" value={counts.availableNowOr14d} />
      </div>
      {data.unmetHeadcount !== null && data.unmetHeadcount > 0 ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          {data.unmetHeadcount} of {data.estimatedHeadcount} positions still uncovered.
        </p>
      ) : null}
      <p className="text-xs text-gray-500">
        Required trades: {data.requiredTrades.map((t) => TRADE_LABELS[t]).join(", ") || "—"}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-gray-500">{message}</p>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

interface EditorFormProps {
  draftTrades: TradeKey[];
  draftHeadcount: string;
  draftRadius: string;
  draftLocation: string;
  isSaving: boolean;
  onToggleTrade: (k: TradeKey) => void;
  onChangeHeadcount: (v: string) => void;
  onChangeRadius: (v: string) => void;
  onChangeLocation: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

function EditorForm(props: EditorFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Required trades</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {TRADE_KEYS.map((k) => {
            const checked = props.draftTrades.includes(k);
            return (
              <label
                key={k}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                  checked
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => props.onToggleTrade(k)}
                  className="rounded"
                />
                {TRADE_LABELS[k]}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm text-gray-700">Estimated headcount</span>
          <input
            type="number"
            min={0}
            value={props.draftHeadcount}
            onChange={(e) => props.onChangeHeadcount(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Radius (km)</span>
          <input
            type="number"
            min={0}
            value={props.draftRadius}
            onChange={(e) => props.onChangeRadius(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-sm text-gray-700">Project site location</span>
          <input
            type="text"
            placeholder="e.g. Kathu, Northern Cape"
            value={props.draftLocation}
            onChange={(e) => props.onChangeLocation(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.isSaving}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.isSaving}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {props.isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
