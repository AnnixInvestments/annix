"use client";

import {
  AVAILABILITY_LABELS,
  AVAILABILITY_VALUES,
  type Availability,
  COMMODITIES,
  COMMODITY_LABELS,
  type Commodity,
  emptyTradeProfile,
  type PerTradeProfiles,
  type ShutdownEntry,
  TRADE_KEYS,
  TRADE_LABELS,
  type TradeKey,
  type TradeProfile,
} from "@annix/product-data/sa-market";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DateTime } from "@/app/lib/datetime";
import { useCvSeekerTradeProfile, useCvUpsertSeekerTradeProfile } from "@/app/lib/query/hooks";

export default function SeekerTradeProfilePage() {
  const { showToast } = useToast();
  const query = useCvSeekerTradeProfile();
  const mutation = useCvUpsertSeekerTradeProfile();

  const [profile, setProfile] = useState<TradeProfile>(emptyTradeProfile());

  const queryData = query.data;
  useEffect(() => {
    if (queryData?.profile) {
      setProfile(queryData.profile);
    }
  }, [queryData]);

  const shared = profile.shared;

  const toggleTrade = (key: TradeKey) => {
    const current = shared.tradeKeys;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setProfile({ ...profile, shared: { ...shared, tradeKeys: next } });
  };

  const toggleCommodity = (c: Commodity) => {
    const current = shared.commoditiesWorked;
    const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    setProfile({ ...profile, shared: { ...shared, commoditiesWorked: next } });
  };

  const updateShutdownEntry = (index: number, patch: Partial<ShutdownEntry>) => {
    const next = [...shared.shutdownHistory];
    next[index] = { ...next[index], ...patch };
    setProfile({ ...profile, shared: { ...shared, shutdownHistory: next } });
  };

  const addShutdownEntry = () => {
    const next: ShutdownEntry = {
      siteName: "",
      role: "",
      durationDays: 14,
      year: DateTime.now().year,
    };
    setProfile({
      ...profile,
      shared: { ...shared, shutdownHistory: [...shared.shutdownHistory, next] },
    });
  };

  const removeShutdownEntry = (index: number) => {
    const next = shared.shutdownHistory.filter((_, i) => i !== index);
    setProfile({ ...profile, shared: { ...shared, shutdownHistory: next } });
  };

  const updateYears = (value: string) => {
    const n = Number.parseInt(value, 10);
    setProfile({
      ...profile,
      shared: { ...shared, yearsExperience: Number.isFinite(n) ? n : null },
    });
  };

  const updateRadius = (value: string) => {
    const n = Number.parseInt(value, 10);
    setProfile({
      ...profile,
      shared: { ...shared, siteRadiusKm: Number.isFinite(n) ? n : null },
    });
  };

  const updateAvailability = (value: string) => {
    const candidate = value as Availability;
    setProfile({
      ...profile,
      shared: {
        ...shared,
        availability: AVAILABILITY_VALUES.includes(candidate) ? candidate : null,
      },
    });
  };

  const updatePerTrade = (next: PerTradeProfiles) => {
    setProfile({ ...profile, perTrade: next });
  };

  const handleSave = () => {
    mutation.mutate(profile, {
      onSuccess: () => showToast("Trade profile saved", "success"),
      onError: () => showToast("Could not save trade profile", "error"),
    });
  };

  const showPerTradeSections = useMemo(() => shared.tradeKeys.length > 0, [shared.tradeKeys]);

  if (query.isLoading) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Trade profile</h1>
        <p className="text-sm text-gray-600 mt-1">
          Structured details for industrial trades — used to surface mining + shutdown opportunities
          the embedding match can't infer from a CV alone.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Your trades</h2>
        <p className="text-sm text-gray-600">
          Pick every trade you can work. Most boilermakers also weld; tick both.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {TRADE_KEYS.map((key) => {
            const checked = shared.tradeKeys.includes(key);
            return (
              <label
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                  checked
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTrade(key)}
                  className="rounded"
                />
                {TRADE_LABELS[key]}
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Shared details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-700">Years of trade experience</span>
            <input
              type="number"
              min={0}
              max={60}
              value={emptyIfNull(shared.yearsExperience)}
              onChange={(e) => updateYears(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Willing to travel (km)</span>
            <input
              type="number"
              min={0}
              max={2000}
              value={emptyIfNull(shared.siteRadiusKm)}
              onChange={(e) => updateRadius(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Availability</span>
            <select
              value={emptyIfNull(shared.availability)}
              onChange={(e) => updateAvailability(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Not specified</option>
              {AVAILABILITY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {AVAILABILITY_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Commodities worked</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {COMMODITIES.map((c) => {
              const checked = shared.commoditiesWorked.includes(c);
              return (
                <label
                  key={c}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                    checked
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCommodity(c)}
                    className="rounded"
                  />
                  {COMMODITY_LABELS[c]}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Shutdown history</h3>
            <button
              type="button"
              onClick={addShutdownEntry}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              + Add shutdown
            </button>
          </div>
          {shared.shutdownHistory.length === 0 ? (
            <p className="text-xs text-gray-500">
              No shutdowns logged yet. Add the major shutdowns you've worked — site, role, duration,
              year.
            </p>
          ) : (
            <div className="space-y-2">
              {shared.shutdownHistory.map((entry, idx) => (
                <ShutdownEntryRow
                  key={`shutdown-${idx}-${entry.siteName}-${entry.year}`}
                  entry={entry}
                  onChange={(patch) => updateShutdownEntry(idx, patch)}
                  onRemove={() => removeShutdownEntry(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {showPerTradeSections ? (
        <PerTradeSections
          tradeKeys={shared.tradeKeys}
          perTrade={profile.perTrade}
          onChange={updatePerTrade}
        />
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save trade profile"}
        </button>
      </div>
    </div>
  );
}

interface ShutdownEntryRowProps {
  entry: ShutdownEntry;
  onChange: (patch: Partial<ShutdownEntry>) => void;
  onRemove: () => void;
}

function ShutdownEntryRow(props: ShutdownEntryRowProps) {
  const { entry, onChange, onRemove } = props;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
      <label className="block sm:col-span-2">
        <span className="text-xs text-gray-500">Site</span>
        <input
          type="text"
          value={entry.siteName}
          onChange={(e) => onChange({ siteName: e.target.value })}
          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">Role</span>
        <input
          type="text"
          value={entry.role}
          onChange={(e) => onChange({ role: e.target.value })}
          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">Days</span>
        <input
          type="number"
          min={1}
          max={365}
          value={entry.durationDays}
          onChange={(e) => onChange({ durationDays: numberOrFallback(e.target.value, 0) })}
          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </label>
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="text-xs text-gray-500">Year</span>
          <input
            type="number"
            min={1980}
            max={2100}
            value={entry.year}
            onChange={(e) =>
              onChange({ year: numberOrFallback(e.target.value, DateTime.now().year) })
            }
            className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          />
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-1.5 text-xs text-red-600 hover:text-red-700"
          aria-label="Remove shutdown"
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface PerTradeSectionsProps {
  tradeKeys: TradeKey[];
  perTrade: PerTradeProfiles;
  onChange: (next: PerTradeProfiles) => void;
}

function PerTradeSections(props: PerTradeSectionsProps) {
  const { tradeKeys, perTrade, onChange } = props;
  return (
    <div className="space-y-6">
      {tradeKeys.map((key) => (
        <TradeSection key={key} tradeKey={key} perTrade={perTrade} onChange={onChange} />
      ))}
    </div>
  );
}

interface TradeSectionProps {
  tradeKey: TradeKey;
  perTrade: PerTradeProfiles;
  onChange: (next: PerTradeProfiles) => void;
}

function TradeSection(props: TradeSectionProps) {
  const { tradeKey, perTrade, onChange } = props;
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{TRADE_LABELS[tradeKey]}</h2>
      {tradeKey === "boilermaker" ? (
        <BoilermakerForm perTrade={perTrade} onChange={onChange} />
      ) : null}
      {tradeKey === "coded_welder" ? (
        <CodedWelderForm perTrade={perTrade} onChange={onChange} />
      ) : null}
      {tradeKey === "rubber_liner" ? (
        <RubberLinerForm perTrade={perTrade} onChange={onChange} />
      ) : null}
      {tradeKey === "pipe_fitter" ? (
        <PipeFitterForm perTrade={perTrade} onChange={onChange} />
      ) : null}
      {tradeKey === "diesel_mechanic" ? (
        <DieselMechanicForm perTrade={perTrade} onChange={onChange} />
      ) : null}
      {tradeKey === "rigger" ? <RiggerForm perTrade={perTrade} onChange={onChange} /> : null}
      {tradeKey === "electrician" ? (
        <ElectricianForm perTrade={perTrade} onChange={onChange} />
      ) : null}
    </section>
  );
}

interface PerTradeFormProps {
  perTrade: PerTradeProfiles;
  onChange: (next: PerTradeProfiles) => void;
}

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function emptyIfNull<T>(value: T | null | undefined): T | "" {
  return value == null ? "" : value;
}

function numberOrFallback(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function stringOrNull(raw: string): string | null {
  return raw === "" ? null : raw;
}

function BoilermakerForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.boilermaker;
  const current = stored
    ? stored
    : {
        codedTickets: [],
        pressureVesselExperience: false,
        specialisations: [],
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, boilermaker: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Coded tickets (comma-separated, e.g. 6G, ARC SS)</span>
        <input
          type="text"
          defaultValue={current.codedTickets.join(", ")}
          onBlur={(e) => set({ codedTickets: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Specialisations (comma-separated)</span>
        <input
          type="text"
          defaultValue={current.specialisations.join(", ")}
          onBlur={(e) => set({ specialisations: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.pressureVesselExperience}
          onChange={(e) => set({ pressureVesselExperience: e.target.checked })}
        />
        <span>Pressure-vessel experience</span>
      </label>
    </div>
  );
}

function CodedWelderForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.coded_welder;
  const current = stored
    ? stored
    : {
        processes: [],
        positions: [],
        materialsCoded: [],
        thicknessMinMm: null,
        thicknessMaxMm: null,
        saqccCertificateNumber: null,
        saqccValidUntil: null,
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, coded_welder: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Processes (e.g. SMAW, GTAW, GMAW, FCAW)</span>
        <input
          type="text"
          defaultValue={current.processes.join(", ")}
          onBlur={(e) => set({ processes: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Positions (1G, 2G, 3G, 4G, 5G, 6G, 6GR)</span>
        <input
          type="text"
          defaultValue={current.positions.join(", ")}
          onBlur={(e) => set({ positions: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Materials coded (CS, SS, duplex, CrMo, Inconel)</span>
        <input
          type="text"
          defaultValue={current.materialsCoded.join(", ")}
          onBlur={(e) => set({ materialsCoded: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-gray-700">Min thickness (mm)</span>
          <input
            type="number"
            min={0}
            value={emptyIfNull(current.thicknessMinMm)}
            onChange={(e) =>
              set({
                thicknessMinMm: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Max thickness (mm)</span>
          <input
            type="number"
            min={0}
            value={emptyIfNull(current.thicknessMaxMm)}
            onChange={(e) =>
              set({
                thicknessMaxMm: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-gray-700">SAQCC certificate number</span>
          <input
            type="text"
            value={emptyIfNull(current.saqccCertificateNumber)}
            onChange={(e) => set({ saqccCertificateNumber: stringOrNull(e.target.value) })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Valid until</span>
          <input
            type="date"
            value={emptyIfNull(current.saqccValidUntil)}
            onChange={(e) => set({ saqccValidUntil: stringOrNull(e.target.value) })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
      </div>
    </div>
  );
}

function RubberLinerForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.rubber_liner;
  const current = stored
    ? stored
    : {
        linerCertifications: [],
        chuteAndMillExperience: false,
        adhesiveSystemsUsed: [],
        maxVesselSizeM3: null,
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, rubber_liner: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Liner certifications (e.g. Rema Tip Top, Linatex)</span>
        <input
          type="text"
          defaultValue={current.linerCertifications.join(", ")}
          onBlur={(e) => set({ linerCertifications: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Adhesive systems used</span>
        <input
          type="text"
          defaultValue={current.adhesiveSystemsUsed.join(", ")}
          onBlur={(e) => set({ adhesiveSystemsUsed: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Max vessel size (m³)</span>
        <input
          type="number"
          min={0}
          value={emptyIfNull(current.maxVesselSizeM3)}
          onChange={(e) =>
            set({
              maxVesselSizeM3: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.chuteAndMillExperience}
          onChange={(e) => set({ chuteAndMillExperience: e.target.checked })}
        />
        <span>Chute &amp; mill liner experience</span>
      </label>
    </div>
  );
}

function PipeFitterForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.pipe_fitter;
  const current = stored
    ? stored
    : {
        pipeSpecExperience: [],
        maxDiameterMm: null,
        flangeBoltingTorqueCert: false,
        weldFitupExperience: false,
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, pipe_fitter: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Pipe spec experience (ASME B31.3, B31.1, B16.5)</span>
        <input
          type="text"
          defaultValue={current.pipeSpecExperience.join(", ")}
          onBlur={(e) => set({ pipeSpecExperience: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Max pipe diameter (mm)</span>
        <input
          type="number"
          min={0}
          value={emptyIfNull(current.maxDiameterMm)}
          onChange={(e) =>
            set({
              maxDiameterMm: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.flangeBoltingTorqueCert}
          onChange={(e) => set({ flangeBoltingTorqueCert: e.target.checked })}
        />
        <span>Flange-bolting / torque certification</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.weldFitupExperience}
          onChange={(e) => set({ weldFitupExperience: e.target.checked })}
        />
        <span>Weld fit-up experience</span>
      </label>
    </div>
  );
}

function DieselMechanicForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.diesel_mechanic;
  const current = stored
    ? stored
    : {
        enginesWorked: [],
        vehiclesWorked: [],
        electronicDiagnosticsTools: [],
        mineFleetExperience: false,
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, diesel_mechanic: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Engines worked (Cat, Cummins, Komatsu, Volvo, Iveco)</span>
        <input
          type="text"
          defaultValue={current.enginesWorked.join(", ")}
          onBlur={(e) => set({ enginesWorked: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">
          Vehicles worked (Articulated trucks, Dozers, Excavators)
        </span>
        <input
          type="text"
          defaultValue={current.vehiclesWorked.join(", ")}
          onBlur={(e) => set({ vehiclesWorked: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="block">
        <span className="text-gray-700">Electronic diagnostics tools</span>
        <input
          type="text"
          defaultValue={current.electronicDiagnosticsTools.join(", ")}
          onBlur={(e) => set({ electronicDiagnosticsTools: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.mineFleetExperience}
          onChange={(e) => set({ mineFleetExperience: e.target.checked })}
        />
        <span>Mine-fleet experience</span>
      </label>
    </div>
  );
}

function RiggerForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.rigger;
  const current = stored
    ? stored
    : {
        riggerClass: null,
        maxLiftWeightTons: null,
        mobileCraneExperience: false,
        towerCraneExperience: false,
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, rigger: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Rigger class</span>
        <select
          value={emptyIfNull(current.riggerClass)}
          onChange={(e) =>
            set({
              riggerClass: stringOrNull(e.target.value) as typeof current.riggerClass,
            })
          }
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Not specified</option>
          <option value="rigger">Rigger</option>
          <option value="rigger_intermediate">Rigger (Intermediate)</option>
          <option value="rigger_advanced">Rigger (Advanced)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-gray-700">Max lift weight (tons)</span>
        <input
          type="number"
          min={0}
          value={emptyIfNull(current.maxLiftWeightTons)}
          onChange={(e) =>
            set({
              maxLiftWeightTons: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.mobileCraneExperience}
          onChange={(e) => set({ mobileCraneExperience: e.target.checked })}
        />
        <span>Mobile-crane experience</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.towerCraneExperience}
          onChange={(e) => set({ towerCraneExperience: e.target.checked })}
        />
        <span>Tower-crane experience</span>
      </label>
    </div>
  );
}

function ElectricianForm({ perTrade, onChange }: PerTradeFormProps) {
  const stored = perTrade.electrician;
  const current = stored
    ? stored
    : {
        section13Certificate: false,
        competencyVoltage: null,
        specialClasses: [],
        mineHealthSafetyCert: false,
      };
  const set = (patch: Partial<typeof current>) =>
    onChange({ ...perTrade, electrician: { ...current, ...patch } });
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-gray-700">Competency voltage</span>
        <select
          value={emptyIfNull(current.competencyVoltage)}
          onChange={(e) =>
            set({
              competencyVoltage: stringOrNull(e.target.value) as typeof current.competencyVoltage,
            })
          }
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Not specified</option>
          <option value="lv">Low voltage</option>
          <option value="mv">Medium voltage</option>
          <option value="hv">High voltage</option>
        </select>
      </label>
      <label className="block">
        <span className="text-gray-700">Special classes (mine, panel, instrumentation)</span>
        <input
          type="text"
          defaultValue={current.specialClasses.join(", ")}
          onBlur={(e) => set({ specialClasses: csvToArray(e.target.value) })}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.section13Certificate}
          onChange={(e) => set({ section13Certificate: e.target.checked })}
        />
        <span>Section 13 certificate</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={current.mineHealthSafetyCert}
          onChange={(e) => set({ mineHealthSafetyCert: e.target.checked })}
        />
        <span>Mine Health &amp; Safety Act competency</span>
      </label>
    </div>
  );
}
