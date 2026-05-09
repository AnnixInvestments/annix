"use client";

import { isArray, isString, keys, toPairs } from "es-toolkit/compat";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api-config";

// Mining-slurry common range presets — one dropdown per text field
// so the customer can pick from a list instead of typing free-text.
// Selecting a preset fills the matching text input; the customer
// can still override by typing afterwards.
const RANGE_PRESETS = {
  ph: [
    "<2 (acid leach)",
    "2–4 (acidic)",
    "4–6 (mildly acidic)",
    "6–8 (neutral)",
    "8–10 (alkaline)",
    "10–12 (caustic / lime)",
    ">12 (highly caustic)",
  ],
  tempC: [
    "<10 (chilled)",
    "10–30 (ambient)",
    "30–60 (warm process)",
    "60–90 (hot)",
    "90–120 (very hot)",
    ">120 (high temp)",
  ],
  solidsPct: [
    "<5 (dilute)",
    "5–15 (low)",
    "15–30 (medium tailings)",
    "30–50 (thick)",
    "50–70 (paste)",
    ">70 (very thick paste)",
  ],
  particleMm: [
    "<0.1 (fine)",
    "0.1–1",
    "1–5 (coarse)",
    "5–25 (large)",
    "25–50 (very large)",
    ">50 (lumps)",
  ],
  sg: [
    "1.0 (water)",
    "1.0–1.2 (light slurry)",
    "1.2–1.5 (medium)",
    "1.5–2.0 (heavy)",
    ">2.0 (very heavy)",
  ],
  chlorides: [
    "<50 (low)",
    "50–200 (moderate)",
    "200–1000 (elevated)",
    "1000–10000 (high — duplex)",
    ">10000 (super-duplex)",
  ],
  flow: ["<10 m³/h", "10–50 m³/h", "50–200 m³/h", "200–500 m³/h", "500–1000 m³/h", ">1000 m³/h"],
  shutoffDp: ["<2 bar", "2–6 bar", "6–10 bar", "10–16 bar", "16–25 bar", ">25 bar"],
  cycle: ["<1/day (rare)", "1–10/day", "10–100/day", "100–1000/day", ">1000/day (continuous)"],
} as const;

// Valve category extracted from description for the
// apply-to-similar-valves heuristic. Keys are ordered so the most
// specific keyword wins (pinch valve before valve, hand pump before
// pump).
const valveCategory = (description: string): string => {
  const text = description.toLowerCase();
  if (/\bpinch\s*valve\b/.test(text)) return "pinch-valve";
  if (/\bgate\s*valve\b|\brsv\b/.test(text)) return "gate-valve";
  if (/\bglobe\s*valve\b/.test(text)) return "globe-valve";
  if (/\bball\s*valve\b/.test(text)) return "ball-valve";
  if (/\bbutterfly\s*valve\b/.test(text)) return "butterfly-valve";
  if (/\bcheck\s*valve\b/.test(text)) return "check-valve";
  if (/\bknife\s*(gate\s*)?valve\b/.test(text)) return "knife-valve";
  if (/\bhand\s*pump\b/.test(text)) return "hand-pump";
  if (/\bhydraulic\s*pump\b/.test(text)) return "hydraulic-pump";
  if (/\bpump\b/.test(text)) return "pump";
  if (/\bvalve\b/.test(text)) return "valve";
  return "other";
};

// Public, token-gated clarification form. Customer follows the link
// from the email; no login required.
//
// The form mirrors the same field set as the fillable PDF
// attachment (annix-backend/src/email/templates/rfq-clarification-pdf.ts)
// so the team gets the same shape regardless of which route the
// customer used. Both routes POST to /rfq/clarifications/:token/submit
// with a { responses } payload.

interface MissingDrawing {
  ref: string;
  itemNumbers: string[];
}

interface ValveSpecGap {
  itemId: string;
  itemNumber: string;
  description: string;
  missingFields: string[];
}

interface ClarificationFetch {
  token: string;
  customerEmail: string | null;
  projectName: string | null;
  rfqReference: string | null;
  requirements: {
    missingDrawings?: MissingDrawing[];
    valveSpecGaps?: ValveSpecGap[];
    customerName?: string | null;
    customNote?: string | null;
  };
  respondedAt: string | null;
}

type DrawingStatus = "willAttach" | "notAvailable" | "";
type YesNo = "yes" | "no" | "";

interface ValveResponse {
  media: string;
  isSlurry: YesNo;
  solidsPct: string;
  particleMm: string;
  sg: string;
  ph: string;
  tempC: string;
  chlorides: string;
  oxidisers: YesNo;
  minFlow: string;
  normalFlow: string;
  maxFlow: string;
  shutoffDp: string;
  flangeSpec: string;
  faceToFace: string;
  body: string;
  seat: string;
  flowDir: string;
  mounting: string;
  reverseP: YesNo;
  actuation: string;
  failPos: string;
  voltage: string;
  duty: string;
  cycle: string;
  dischargeAtm: YesNo;
  waterHammer: YesNo;
  leakage: string;
  mhsa: YesNo;
  sans347: YesNo;
  notes: string;
}

const emptyValve = (): ValveResponse => ({
  media: "",
  isSlurry: "",
  solidsPct: "",
  particleMm: "",
  sg: "",
  ph: "",
  tempC: "",
  chlorides: "",
  oxidisers: "",
  minFlow: "",
  normalFlow: "",
  maxFlow: "",
  shutoffDp: "",
  flangeSpec: "",
  faceToFace: "",
  body: "",
  seat: "",
  flowDir: "",
  mounting: "",
  reverseP: "",
  actuation: "",
  failPos: "",
  voltage: "",
  duty: "",
  cycle: "",
  dischargeAtm: "",
  waterHammer: "",
  leakage: "",
  mhsa: "",
  sans347: "",
  notes: "",
});

export default function ClarificationFormPage() {
  const params = useParams();
  const tokenRaw = params?.token;
  const token = isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  const [data, setData] = useState<ClarificationFetch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawingStatuses, setDrawingStatuses] = useState<Record<string, DrawingStatus>>({});
  const [valveResponses, setValveResponses] = useState<Record<string, ValveResponse>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/rfq/clarifications/${token}`)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(res.status === 403 ? "Token unknown or expired" : "Load failed");
        return res.json();
      })
      .then((payload: ClarificationFetch) => {
        setData(payload);
        if (payload.respondedAt) setSubmitted(true);
        const initialDrawings: Record<string, DrawingStatus> = {};
        const rawMissingDrawings = payload.requirements.missingDrawings;
        const drawingsList = rawMissingDrawings || [];
        drawingsList.forEach((d) => {
          initialDrawings[d.ref] = "";
        });
        setDrawingStatuses(initialDrawings);
        const initialValves: Record<string, ValveResponse> = {};
        const rawValveSpecGaps = payload.requirements.valveSpecGaps;
        const valvesList = rawValveSpecGaps || [];
        valvesList.forEach((v) => {
          initialValves[v.itemId] = emptyValve();
        });
        setValveResponses(initialValves);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Load failed");
      });
  }, [token]);

  // Per-valve refs so the Apply-to-similar handler can scroll the
  // next un-filled valve into view (or the Submit button if every
  // valve is now complete).
  const valveRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const updateValve = (id: string, key: keyof ValveResponse, value: string) => {
    setValveResponses((prev) => {
      const rawCurrent = prev[id];
      const current = rawCurrent || emptyValve();
      return { ...prev, [id]: { ...current, [key]: value } };
    });
  };

  // Heuristic: a valve is "filled" if it has at least three answers
  // beyond the initial empty state. Used to decide where to scroll
  // after an Apply-to-similar click.
  const valveIsFilled = (resp: ValveResponse | undefined): boolean => {
    if (!resp) return false;
    const filledCount = toPairs(resp).filter((pair: [string, unknown]) => {
      const [pairKey, pairValue] = pair;
      if (pairKey === "notes") return false;
      return isString(pairValue) && pairValue.trim().length > 0;
    }).length;
    return filledCount >= 3;
  };

  // Merge srcResp into a fresh copy of targetResp, but only for
  // fields that are empty on the target. Keeps any values the
  // customer has already typed on the downstream valve.
  const mergeFillEmptyOnly = (srcResp: ValveResponse, targetResp: ValveResponse): ValveResponse => {
    const merged: ValveResponse = { ...targetResp };
    keys(srcResp).forEach((key) => {
      const typedKey = key as keyof ValveResponse;
      const sv = srcResp[typedKey];
      const tv = targetResp[typedKey];
      if (isString(sv) && sv.trim().length > 0 && (!isString(tv) || tv.trim().length === 0)) {
        (merged as unknown as Record<string, string>)[typedKey] = sv;
      }
    });
    return merged;
  };

  // Copy this valve's filled answers across every subsequent valve
  // sharing the same valveCategory. Skips fields that are already
  // filled on the target so the customer doesn't lose downstream
  // edits. After the copy we scroll to the next un-filled valve
  // OR the Submit button if everything's complete.
  const applyToSimilarValves = (sourceItemId: string) => {
    if (!data) return;
    const rawValveSpecGaps = data.requirements.valveSpecGaps;
    const valves = rawValveSpecGaps || [];
    const sourceIdx = valves.findIndex((v) => v.itemId === sourceItemId);
    if (sourceIdx < 0) return;
    const sourceCategory = valveCategory(valves[sourceIdx].description);
    const sourceResp = valveResponses[sourceItemId];
    if (!sourceResp) return;

    // Subset of valves below the source that share its category —
    // these are the ones we'll fill.
    const targets = valves
      .slice(sourceIdx + 1)
      .filter((v) => valveCategory(v.description) === sourceCategory);

    setValveResponses((prev) => {
      const next = { ...prev };
      targets.forEach((target) => {
        const rawTargetResp = next[target.itemId];
        const targetResp = rawTargetResp || emptyValve();
        next[target.itemId] = mergeFillEmptyOnly(sourceResp, targetResp);
      });
      return next;
    });

    // Defer the scroll so the state update + re-render happens first.
    // Re-derive the post-merge state for the scroll target check —
    // valveResponses is still the pre-state inside this closure.
    requestAnimationFrame(() => {
      const projected = { ...valveResponses };
      targets.forEach((target) => {
        const rawTargetResp2 = projected[target.itemId];
        const targetResp2 = rawTargetResp2 || emptyValve();
        projected[target.itemId] = mergeFillEmptyOnly(sourceResp, targetResp2);
      });
      const nextUnfilled = valves.find(
        (v, idx) => idx > sourceIdx && !valveIsFilled(projected[v.itemId]),
      );
      if (nextUnfilled) {
        valveRefs.current[nextUnfilled.itemId]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        submitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  const submit = async () => {
    if (!token || !data) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/rfq/clarifications/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: {
            drawings: drawingStatuses,
            valves: valveResponses,
          },
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const candidateMessage = json && isString(json.message) ? json.message : null;
        const message = candidateMessage || "Submission failed";
        throw new Error(message);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">We couldn't load this form</h1>
          <p className="text-sm text-gray-600">{error}</p>
          <p className="text-xs text-gray-500 mt-4">
            If you think this is a mistake, please reply to the email or contact info@annix.co.za.
          </p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-600">Loading clarification form…</p>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-green-700 mb-2">Thanks — we've got it</h1>
          <p className="text-sm text-gray-600">
            Your responses are recorded. Our team will re-run the take-off and email the full
            quotation through shortly.
          </p>
        </div>
      </div>
    );
  }

  const rawDrawingsList = data.requirements.missingDrawings;
  const drawings = rawDrawingsList || [];
  const rawValvesList = data.requirements.valveSpecGaps;
  const valves = rawValvesList || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-blue-700">Pre-Quote Clarifications</h1>
          {data.projectName && (
            <p className="text-sm text-gray-700 mt-2">
              Project: <strong>{data.projectName}</strong>
              {data.rfqReference ? <> — {data.rfqReference}</> : null}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-3">
            Tick the boxes / fill in the answers below and hit Submit at the bottom. Most fields are
            short — your project engineer can probably answer the lot in 5 minutes.
          </p>
        </header>

        {drawings.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Drawings required</h2>
            <p className="text-xs text-gray-500 mb-4">
              For each drawing, tell us whether you'll attach it to your reply or whether it's not
              available so we know to omit those items.
            </p>
            <div className="space-y-3">
              {drawings.map((d) => (
                <div key={d.ref} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold">{d.ref}</span>
                    <span className="text-xs text-gray-500">items {d.itemNumbers.join(", ")}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {(["willAttach", "notAvailable"] as DrawingStatus[]).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`drawing.${d.ref}`}
                          checked={drawingStatuses[d.ref] === opt}
                          onChange={() => setDrawingStatuses((prev) => ({ ...prev, [d.ref]: opt }))}
                          className="w-4 h-4"
                        />
                        <span>
                          {opt === "willAttach"
                            ? "Will attach to reply"
                            : "Not available — please omit affected items"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {valves.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Valve specifications required ({valves.length})
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              For mining-grade valve duties (slurry / tailings / lime / acid leach / cyclone feed)
              we need a bit more than just size + PN. Leave anything you genuinely don't know blank
              — we'll come back with the gaps.
            </p>
            <div className="space-y-6">
              {valves.map((valve, valveIdx) => {
                const rawValveResponse = valveResponses[valve.itemId];
                const r = rawValveResponse || emptyValve();
                // Identify how many subsequent valves share this
                // category — drives whether to render the
                // Apply-to-similar shortcut.
                const thisCategory = valveCategory(valve.description);
                const similarBelow = valves
                  .slice(valveIdx + 1)
                  .filter((other) => valveCategory(other.description) === thisCategory).length;
                return (
                  <div
                    key={valve.itemId}
                    ref={(el) => {
                      valveRefs.current[valve.itemId] = el;
                    }}
                    className="border border-gray-200 rounded-lg p-4 scroll-mt-4"
                  >
                    <h3 className="font-semibold text-sm text-gray-900 mb-1">
                      Item {valve.itemNumber}
                    </h3>
                    <p className="text-xs text-gray-600 mb-4 italic">{valve.description}</p>

                    <ValveSection title="1. Process conditions">
                      <Text
                        label="Process media"
                        value={r.media}
                        onChange={(v) => updateValve(valve.itemId, "media", v)}
                      />
                      <YesNoField
                        label="Slurry service?"
                        value={r.isSlurry}
                        onChange={(v) => updateValve(valve.itemId, "isSlurry", v)}
                      />
                      {r.isSlurry === "yes" && (
                        <>
                          <Text
                            label="Solids concentration (%)"
                            value={r.solidsPct}
                            onChange={(v) => updateValve(valve.itemId, "solidsPct", v)}
                            presets={RANGE_PRESETS.solidsPct}
                          />
                          <Text
                            label="Maximum particle size (mm)"
                            value={r.particleMm}
                            onChange={(v) => updateValve(valve.itemId, "particleMm", v)}
                            presets={RANGE_PRESETS.particleMm}
                          />
                          <Text
                            label="Specific gravity / density"
                            value={r.sg}
                            onChange={(v) => updateValve(valve.itemId, "sg", v)}
                            presets={RANGE_PRESETS.sg}
                          />
                        </>
                      )}
                      <Text
                        label="pH"
                        value={r.ph}
                        onChange={(v) => updateValve(valve.itemId, "ph", v)}
                        presets={RANGE_PRESETS.ph}
                      />
                      <Text
                        label="Operating temperature (°C)"
                        value={r.tempC}
                        onChange={(v) => updateValve(valve.itemId, "tempC", v)}
                        presets={RANGE_PRESETS.tempC}
                      />
                      <Text
                        label="Chloride concentration (ppm)"
                        value={r.chlorides}
                        onChange={(v) => updateValve(valve.itemId, "chlorides", v)}
                        presets={RANGE_PRESETS.chlorides}
                      />
                      <YesNoField
                        label="Dissolved O₂ / oxidisers present?"
                        value={r.oxidisers}
                        onChange={(v) => updateValve(valve.itemId, "oxidisers", v)}
                      />
                      <Text
                        label="Min flow (m³/h)"
                        value={r.minFlow}
                        onChange={(v) => updateValve(valve.itemId, "minFlow", v)}
                        presets={RANGE_PRESETS.flow}
                      />
                      <Text
                        label="Normal flow (m³/h)"
                        value={r.normalFlow}
                        onChange={(v) => updateValve(valve.itemId, "normalFlow", v)}
                        presets={RANGE_PRESETS.flow}
                      />
                      <Text
                        label="Max flow (m³/h)"
                        value={r.maxFlow}
                        onChange={(v) => updateValve(valve.itemId, "maxFlow", v)}
                        presets={RANGE_PRESETS.flow}
                      />
                      <Text
                        label="Shut-off ΔP (bar)"
                        value={r.shutoffDp}
                        onChange={(v) => updateValve(valve.itemId, "shutoffDp", v)}
                        presets={RANGE_PRESETS.shutoffDp}
                      />
                    </ValveSection>

                    <ValveSection title="2. Mechanical">
                      <Text
                        label="Flange spec / SANS 1123 table"
                        value={r.flangeSpec}
                        onChange={(v) => updateValve(valve.itemId, "flangeSpec", v)}
                      />
                      <Text
                        label="Face-to-face standard"
                        value={r.faceToFace}
                        onChange={(v) => updateValve(valve.itemId, "faceToFace", v)}
                      />
                      <Choice
                        label="Body / gate material"
                        value={r.body}
                        options={["CS", "304", "316", "Duplex", "High-Cr", "Other"]}
                        onChange={(v) => updateValve(valve.itemId, "body", v)}
                      />
                      <Choice
                        label="Seat / sleeve elastomer"
                        value={r.seat}
                        options={["NR", "EPDM", "NBR", "Viton", "Hypalon", "Metal+WC", "Other"]}
                        onChange={(v) => updateValve(valve.itemId, "seat", v)}
                      />
                      <Choice
                        label="Flow direction"
                        value={r.flowDir}
                        options={["Uni-directional", "Bi-directional"]}
                        onChange={(v) => updateValve(valve.itemId, "flowDir", v)}
                      />
                      <Choice
                        label="Mounting orientation"
                        value={r.mounting}
                        options={["Vertical", "Horizontal", "Both"]}
                        onChange={(v) => updateValve(valve.itemId, "mounting", v)}
                      />
                      <YesNoField
                        label="Reverse pressure expected?"
                        value={r.reverseP}
                        onChange={(v) => updateValve(valve.itemId, "reverseP", v)}
                      />
                      <Choice
                        label="Actuation"
                        value={r.actuation}
                        options={["Manual", "Pneumatic", "Electric", "Hydraulic"]}
                        onChange={(v) => updateValve(valve.itemId, "actuation", v)}
                      />
                      {r.actuation && r.actuation !== "Manual" && (
                        <>
                          <Choice
                            label="Fail position"
                            value={r.failPos}
                            options={["Fail Open", "Fail Closed", "Fail Last"]}
                            onChange={(v) => updateValve(valve.itemId, "failPos", v)}
                          />
                          <Text
                            label="Voltage / air supply"
                            value={r.voltage}
                            onChange={(v) => updateValve(valve.itemId, "voltage", v)}
                          />
                        </>
                      )}
                    </ValveSection>

                    <ValveSection title="3. Duty profile">
                      <Choice
                        label="Service type"
                        value={r.duty}
                        options={["Isolation", "Control", "Modulating"]}
                        onChange={(v) => updateValve(valve.itemId, "duty", v)}
                      />
                      <Text
                        label="Cycle frequency (cycles/day or year)"
                        value={r.cycle}
                        onChange={(v) => updateValve(valve.itemId, "cycle", v)}
                        presets={RANGE_PRESETS.cycle}
                      />
                      <YesNoField
                        label="Discharge to atmosphere?"
                        value={r.dischargeAtm}
                        onChange={(v) => updateValve(valve.itemId, "dischargeAtm", v)}
                      />
                      <YesNoField
                        label="Water-hammer / surge expected?"
                        value={r.waterHammer}
                        onChange={(v) => updateValve(valve.itemId, "waterHammer", v)}
                      />
                    </ValveSection>

                    <ValveSection title="4. Standards & compliance">
                      <Choice
                        label="Leakage class"
                        value={r.leakage}
                        options={["I", "II", "III", "IV", "V", "VI"]}
                        onChange={(v) => updateValve(valve.itemId, "leakage", v)}
                      />
                      <YesNoField
                        label="MHSA Section 21 CoC required?"
                        value={r.mhsa}
                        onChange={(v) => updateValve(valve.itemId, "mhsa", v)}
                      />
                      <YesNoField
                        label="SANS 347 PED equivalent required?"
                        value={r.sans347}
                        onChange={(v) => updateValve(valve.itemId, "sans347", v)}
                      />
                    </ValveSection>

                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Notes for this valve
                      </label>
                      <textarea
                        value={r.notes}
                        onChange={(e) => updateValve(valve.itemId, "notes", e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    {/* Apply-to-similar shortcut. Only renders when
                        there's at least one similar valve still
                        below this one in the list. After click we
                        scroll to the next un-filled valve (or the
                        Submit button if all filled). */}
                    {similarBelow > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-xs text-gray-600">
                          Got {similarBelow} more {thisCategory.replace(/-/g, " ")}
                          {similarBelow === 1 ? "" : "s"} below with similar specs?
                        </p>
                        <button
                          type="button"
                          onClick={() => applyToSimilarValves(valve.itemId)}
                          className="px-3 py-1.5 text-xs font-medium rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Apply this valve's answers to similar items below ↓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Submitting this form notifies the Annix team automatically.
          </p>
          <button
            ref={submitRef}
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-6 py-2 rounded-lg font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit clarifications"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
}

function ValveSection(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-3 border-t border-gray-100 pt-3">
      <h4 className="text-xs font-bold uppercase text-gray-700 tracking-wide mb-2">
        {props.title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{props.children}</div>
    </div>
  );
}

function Text(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  // Optional quick-pick range presets — when supplied, a small
  // dropdown sits next to the text input. Selecting a preset fills
  // the field; the customer can still edit / override.
  presets?: readonly string[];
}) {
  const presets = props.presets;
  return (
    <label className="block">
      <span className="text-xs text-gray-700">{props.label}</span>
      <div className="mt-0.5 flex gap-1">
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm"
        />
        {presets && presets.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) props.onChange(e.target.value);
            }}
            title="Pick a typical range"
            className="px-1.5 py-1 border border-gray-300 rounded text-xs bg-blue-50 text-blue-700 cursor-pointer max-w-[110px]"
          >
            <option value="">Quick pick…</option>
            {presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>
    </label>
  );
}

function YesNoField(props: { label: string; value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-700">{props.label}</span>
      <div className="mt-0.5 flex gap-3 text-sm">
        {(["yes", "no"] as YesNo[]).map((opt) => (
          <label key={opt} className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              checked={props.value === opt}
              onChange={() => props.onChange(opt)}
              className="w-3.5 h-3.5"
            />
            <span>{opt === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </div>
    </label>
  );
}

function Choice(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-700">{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-0.5 w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
      >
        <option value="">—</option>
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
