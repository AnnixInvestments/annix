import { outerDiameterFromNB } from "@/app/lib/query/hooks";
import { calculateTotalSurfaceArea, type SurfaceAreaResult } from "@/app/lib/utils/pipeSurfaceArea";
import type { QuoteItem } from "./poolItemsBySpec";

export interface ItemSurfaceArea {
  /** Per-pipe areas (one item of `quantity = 1`). */
  perPipe: SurfaceAreaResult;
  /** Multiplied by `quoteItem.quantity`. */
  total: {
    totalExternalAreaM2: number;
    totalInternalAreaM2: number;
    totalSurfaceAreaM2: number;
  };
}

/**
 * Fitting classification — chosen from itemType + description so the area
 * calculator can pick the right formula. "pipe" covers straight pipes and
 * spools; everything else needs its own surface-area treatment.
 */
type FittingKind =
  | "pipe"
  | "bend_90"
  | "bend_45"
  | "bend_180"
  | "reducer"
  | "tee"
  | "manifold"
  | "flange"
  | "equal_y";

function classifyFitting(item: QuoteItem): FittingKind {
  const rawType = item.itemType;
  const rawDesc = item.description;
  const typeStr = rawType ? rawType : "";
  const descStr = rawDesc ? rawDesc : "";
  const haystack = `${typeStr} ${descStr}`.toLowerCase();
  // "Equal-Y" / "Wye" / "Y-piece" — three-arm 45°/120° branch.
  if (/\bequal[\s-]*y\b|\bwye\b|\by[\s-]*piece\b/.test(haystack)) return "equal_y";
  if (/\bflange\b/.test(haystack)) return "flange";
  if (/\breducer\b/.test(haystack)) return "reducer";
  // Manifold = main pipe with multiple stubs (more branches than a regular
  // tee). Distinct surface-area formula: main run + n × branch C/F +
  // flange allowance for the (n + 2) ends.
  if (/\bmanifold\b/.test(haystack)) return "manifold";
  // Polymer-Lining shop convention: "U-Tee" / "U-TEE" = Unequal Tee (reducing
  // tee), and "E-Tee" / "E-TEE" = Equal Tee. NOT a 180° U-bend. The genuine
  // U-bend case is matched below via "U-bend" or "180°".
  if (
    /\btee\b|\bt[\s-]?piece\b|\bu[\s-]?tee\b|\be[\s-]?tee\b|\bunequal[\s-]*tee\b|\bequal[\s-]*tee\b/.test(
      haystack,
    )
  ) {
    return "tee";
  }
  if (/\bu[\s-]?bend\b|\b180[°\s]/.test(haystack)) return "bend_180";
  if (/\b45[°\s]|\b45\s*deg/.test(haystack)) return "bend_45";
  if (/\belbow\b|\bbend\b|\b90[°\s]|\b90\s*deg/.test(haystack)) return "bend_90";
  return "pipe";
}

/**
 * Parses a "primary × secondary" NB pair from the description for tees and
 * reducers. Accepts `400x350`, `400 × 350`, `350NB × 150NB`, `400/350` and
 * the same with `mm`. Returns the smaller of the two values when both are
 * present — callers pair it with `item.diameter` (which carries the larger
 * NB) to drive frustum / branch geometry.
 */
function secondaryNbFromDescription(item: QuoteItem): number | null {
  const desc = item.description;
  if (!desc) return null;
  const match = desc.match(/(\d{2,4})\s*(?:NB)?\s*(?:mm)?\s*[×x*/-]\s*(\d{2,4})\s*(?:NB)?/i);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a <= 0 || b <= 0) return null;
  const primary = item.diameter;
  if (primary && (a === primary || b === primary)) return a === primary ? b : a;
  return Math.min(a, b);
}

function ringArea(odMm: number, idMm: number): number {
  if (idMm <= 0) return (Math.PI * odMm * odMm) / 4 / 1e6;
  return (Math.PI * (odMm * odMm - idMm * idMm)) / 4 / 1e6;
}

function asResult(args: {
  externalM2: number;
  internalM2: number;
  quantity: number;
}): ItemSurfaceArea {
  const { externalM2, internalM2, quantity } = args;
  const perPipe: SurfaceAreaResult = {
    externalPipeAreaM2: externalM2,
    internalPipeAreaM2: internalM2,
    externalFlangeBackAreaM2: 0,
    internalFlangeFaceAreaM2: 0,
    totalExternalAreaM2: externalM2,
    totalInternalAreaM2: internalM2,
    totalSurfaceAreaM2: externalM2 + internalM2,
    flangeDataAvailable: false,
  };
  return {
    perPipe,
    total: {
      totalExternalAreaM2: externalM2 * quantity,
      totalInternalAreaM2: internalM2 * quantity,
      totalSurfaceAreaM2: (externalM2 + internalM2) * quantity,
    },
  };
}

/**
 * Centerline bend radius default for buttweld elbows / bends. Long-radius
 * (ASME B16.9 default): R = 1.5 × NB_mm. Used when the drawing doesn't carry
 * an explicit radius dimension.
 */
function defaultBendRadiusMm(nbMm: number): number {
  return 1.5 * nbMm;
}

/**
 * SCH.STD wall-thickness fallback for fittings whose extraction captured the
 * schedule (e.g. "SCH.STD") but not an explicit wallThickness. Without this,
 * id = OD (internal area = 0) and the lining contribution to the unit price
 * silently disappears. Linear fit to ANSI B36.10M SCH.STD across NPS 2–24
 * (within ~25 % across the range — close enough for quoting purposes).
 *
 * The fabrication module still uses the real schedule for cutting; this
 * fallback only affects the m² shown on the customer quote.
 */
function fallbackWallThicknessMm(nbMm: number): number {
  if (nbMm <= 0) return 0;
  return Math.max(3, 0.04 * nbMm + 2);
}

/**
 * Lookup map from `${nb}|${normalisedSchedule}` to wall thickness in mm,
 * built from the pipe_schedules DB table (see usePipeScheduleWallMap).
 */
export type ScheduleWallMap = Record<string, number>;

/**
 * Normalises a pipe-schedule designation to a stable lookup token so a
 * drawing's "HVY" / "SCH.STD" / "SCH40" and the DB's "Heavy" / "STD" /
 * "40" all collapse to the same key. Used both to KEY the schedule-wall
 * map (from DB schedule names) and to LOOK UP a drawing item's schedule
 * against it. Returns null when there's nothing usable.
 */
export function normaliseScheduleDesignation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  if (s.length === 0) return null;
  // Drop a leading "sch" prefix and all dots / spaces / dashes:
  // "SCH.STD" → "std", "SCH 40" → "40", "SCH-80" → "80", "STD" → "std".
  s = s.replace(/^sch[\s.-]*/, "").replace(/[\s.-]+/g, "");
  if (s.length === 0) return null;
  const aliases: Record<string, string> = {
    hvy: "heavy",
    med: "medium",
    lgt: "light",
  };
  const aliased = aliases[s];
  return aliased ? aliased : s;
}

/**
 * Resolves the wall thickness to use for area math:
 *  1. an explicit numeric wallThickness from the extraction, else
 *  2. the real DB wall for the item's schedule (e.g. "HVY" → SABS 62
 *     Heavy) via the schedule-wall map, else
 *  3. the linear SCH.STD approximation.
 */
function effectiveWallMm(item: QuoteItem, nbMm: number, scheduleWallMap?: ScheduleWallMap): number {
  const wt = item.wallThickness;
  if (wt && wt > 0) return wt;
  if (scheduleWallMap) {
    const sched = normaliseScheduleDesignation(item.schedule);
    if (sched) {
      const dbWall = scheduleWallMap[`${nbMm}|${sched}`];
      if (dbWall && dbWall > 0) return dbWall;
    }
  }
  return fallbackWallThicknessMm(nbMm);
}

/**
 * Bend arc length (centerline) for the given total angle in degrees. Caller
 * applies it to π × OD for external area and π × ID for internal area.
 */
function bendArcLengthMm(radiusMm: number, angleDeg: number): number {
  return (Math.PI * radiusMm * angleDeg) / 180;
}

/**
 * Area for a buttweld bend / elbow / U-bend.
 *
 * Polymer-Lining quoting convention (Andrew 2026-05-13): the printed
 * bend dimension on a workshop drawing is the C/F (centre-to-face) — one
 * arm of the elbow from the bend centre to the pipe end face. The shop
 * prices the bend as if it were 2 straight pipes of length C/F joined
 * at the centre (developed length = 2 × C/F), plus the standard
 * 100 mm overlap per flange end. So for a 450NB F.B.E. F/F 90° elbow
 * with C/F = 705 mm:
 *   developed = 2 × 705 + 200 = 1610 mm
 *   external  = π × OD × developed = π × 0.457 × 1.610 ≈ 2.31 m²
 *
 * When the drawing doesn't carry an explicit dimension, fall back to
 * the geometric centreline arc using long-radius R = 1.5 × NB. The arm-
 * doubling convention is preserved only for explicit lengths because a
 * geometric arc isn't twice the radius.
 */
function bendArea(
  item: QuoteItem,
  angleDeg: number,
  nbToOdMap: Record<number, number>,
  scheduleWallMap?: ScheduleWallMap,
): ItemSurfaceArea | null {
  const nb = item.diameter;
  if (nb === null || nb <= 0) return null;
  const odMm = outerDiameterFromNB(nbToOdMap, nb);
  if (odMm <= 0) return null;
  const wt = effectiveWallMm(item, nb, scheduleWallMap);
  const idMm = wt > 0 ? odMm - 2 * wt : 0;
  const explicitLength = item.length;
  const flangeCount = countFlangesFromConfig(item.flangeConfig);
  const flangeAllowanceMm = flangeCount * 100;
  const developedLengthMm =
    explicitLength && explicitLength > 0
      ? 2 * explicitLength + flangeAllowanceMm
      : bendArcLengthMm(defaultBendRadiusMm(nb), angleDeg) + flangeAllowanceMm;
  const externalM2 = (Math.PI * odMm * developedLengthMm) / 1e6;
  const internalM2 = idMm > 0 ? (Math.PI * idMm * developedLengthMm) / 1e6 : 0;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return asResult({ externalM2, internalM2, quantity });
}

/**
 * ASME B16.9 concentric reducer — lateral surface of a frustum. When the
 * drawing gives an explicit `length` we use it; otherwise we approximate the
 * standard length as `H ≈ 0.6 × max(OD)` which lands within ~15 % of the
 * published B16.9 table across NPS 4–24.
 */
function reducerArea(
  item: QuoteItem,
  nbToOdMap: Record<number, number>,
  scheduleWallMap?: ScheduleWallMap,
): ItemSurfaceArea | null {
  const nb1 = item.diameter;
  if (nb1 === null || nb1 <= 0) return null;
  const nb2 = secondaryNbFromDescription(item);
  const od1 = outerDiameterFromNB(nbToOdMap, nb1);
  const od2 = nb2 && nb2 > 0 ? outerDiameterFromNB(nbToOdMap, nb2) : od1 * 0.85;
  if (od1 <= 0 || od2 <= 0) return null;
  // Wall-thickness fallback per end so internal-lining area still computes
  // when the drawing only printed "SCH.STD" without an explicit WT.
  const wt1 = effectiveWallMm(item, nb1, scheduleWallMap);
  const wt2 = effectiveWallMm(item, nb2 && nb2 > 0 ? nb2 : nb1, scheduleWallMap);
  const id1 = wt1 > 0 ? od1 - 2 * wt1 : 0;
  const id2 = wt2 > 0 ? od2 - 2 * wt2 : 0;
  const explicitLength = item.length;
  const lengthMm = explicitLength && explicitLength > 0 ? explicitLength : 0.6 * Math.max(od1, od2);
  const r1 = od1 / 2;
  const r2 = od2 / 2;
  const slantOuter = Math.sqrt(lengthMm * lengthMm + (r1 - r2) * (r1 - r2));
  const slantInner =
    id1 > 0 && id2 > 0 ? Math.sqrt(lengthMm * lengthMm + (id1 / 2 - id2 / 2) ** 2) : 0;
  const frustumExternal = (Math.PI * (r1 + r2) * slantOuter) / 1e6;
  const frustumInternal = slantInner > 0 ? (Math.PI * (id1 / 2 + id2 / 2) * slantInner) / 1e6 : 0;
  // Flange-face overlap: paint / lining wraps ~100 mm onto each flanged
  // end — the same 100-mm-per-end convention pipes, bends, tees and
  // manifolds all apply. reducerArea was the only formula NOT adding it,
  // so a short flanged reducer was undercharged: a 200 mm 125×100 F.B.E
  // reducer came out with LESS m² than a 200 mm 100NB F.B.E pipe even
  // though it's the bigger item (Andrew 2026-05-15). Large end uses od1,
  // small end od2; a single-flange (F.O.E) reducer is assumed flanged
  // on the large end.
  const flangeCount = countFlangesFromConfig(item.flangeConfig);
  const overlapMm = 100;
  let externalFlange = 0;
  let internalFlange = 0;
  if (flangeCount >= 1) {
    externalFlange += (Math.PI * od1 * overlapMm) / 1e6;
    if (id1 > 0) internalFlange += (Math.PI * id1 * overlapMm) / 1e6;
  }
  if (flangeCount >= 2) {
    externalFlange += (Math.PI * od2 * overlapMm) / 1e6;
    if (id2 > 0) internalFlange += (Math.PI * id2 * overlapMm) / 1e6;
  }
  const externalM2 = frustumExternal + externalFlange;
  const internalM2 = frustumInternal + internalFlange;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return asResult({ externalM2, internalM2, quantity });
}

/**
 * Tee surface area — Polymer-Lining quoting convention (Andrew 2026-05-13):
 *
 * - Equal tee (run NB == branch NB): three identical arms of length C/F
 *   each, where C/F = (drawing run length) / 2. Developed length =
 *   3 × C/F + 100 mm per flanged end (3 flanged ends on a typical tee).
 * - Unequal / reducing tee: run length + branch C/F + 100 mm per flanged
 *   end. Branch C/F is estimated as 0.5 × branch_NB + 100 mm (B16.9
 *   approximation across NPS 4–24).
 *
 * Both formulas multiply by OD_run for the external area and ID_run for
 * the internal area (the run dominates and the run NB is the largest of
 * the three faces — conservative for the customer).
 */
function teeArea(
  item: QuoteItem,
  nbToOdMap: Record<number, number>,
  scheduleWallMap?: ScheduleWallMap,
): ItemSurfaceArea | null {
  const nbRun = item.diameter;
  if (nbRun === null || nbRun <= 0) return null;
  const nbBranchParsed = secondaryNbFromDescription(item);
  const nbBranch = nbBranchParsed && nbBranchParsed > 0 ? nbBranchParsed : nbRun;
  const odRun = outerDiameterFromNB(nbToOdMap, nbRun);
  if (odRun <= 0) return null;
  const wtRun = effectiveWallMm(item, nbRun, scheduleWallMap);
  const idRun = wtRun > 0 ? odRun - 2 * wtRun : 0;

  // Tees have 3 open ends. countFlangesFromConfig only returns 0/1/2 (it was
  // designed for pipes); for tees we assume all 3 ends are flanged whenever
  // any flange config is present (matching the "S/O F.X.E F/F" tee callouts
  // on Polymer Lining drawings).
  const pipeFlangeCount = countFlangesFromConfig(item.flangeConfig);
  const flangedEnds = pipeFlangeCount > 0 ? 3 : 0;
  const flangeAllowanceMm = flangedEnds * 100;

  const explicitLength = item.length;
  // Drawing length on a tee row is the run face-to-face. C/F = length / 2.
  const runLengthMm =
    explicitLength && explicitLength > 0 ? explicitLength : 2 * (0.5 * nbRun + 100);

  let developedLengthMm: number;
  if (nbBranch === nbRun) {
    // Equal tee
    const cf = runLengthMm / 2;
    developedLengthMm = 3 * cf + flangeAllowanceMm;
  } else {
    // Unequal / reducing tee
    const branchCfMm = 0.5 * nbBranch + 100;
    developedLengthMm = runLengthMm + branchCfMm + flangeAllowanceMm;
  }

  const externalM2 = (Math.PI * odRun * developedLengthMm) / 1e6;
  const internalM2 = idRun > 0 ? (Math.PI * idRun * developedLengthMm) / 1e6 : 0;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return asResult({ externalM2, internalM2, quantity });
}

/**
 * Manifold = main pipe (the bottom) with `n` stubs branching off. Polymer-
 * Lining quoting convention (Andrew 2026-05-13):
 *
 *   developed = main_run + n × branch_C/F + (n + 2) × 100 mm
 *
 * The (n + 2) flange ends are the 2 ends of the main pipe plus n stub
 * flanges. Branch C/F estimate: 0.5 × branch_NB + 100 mm. Stub count
 * defaults to 2 when not parsable from the description (the lower bound
 * for "multiple stubs"). The description can override via "3-way",
 * "n stubs", or "manifold × n" — the regex below catches all three.
 *
 * Applied at OD_run / ID_run for the entire developed length (the stubs
 * usually share the main NB or are slightly smaller; using the main NB
 * is conservative for the customer).
 */
function manifoldArea(
  item: QuoteItem,
  nbToOdMap: Record<number, number>,
  scheduleWallMap?: ScheduleWallMap,
): ItemSurfaceArea | null {
  const nbRun = item.diameter;
  if (nbRun === null || nbRun <= 0) return null;
  const odRun = outerDiameterFromNB(nbToOdMap, nbRun);
  if (odRun <= 0) return null;
  const wtRun = effectiveWallMm(item, nbRun, scheduleWallMap);
  const idRun = wtRun > 0 ? odRun - 2 * wtRun : 0;

  const stubCount = parseStubCountFromDescription(item.description) ?? 2;
  const nbBranchParsed = secondaryNbFromDescription(item);
  const nbBranch = nbBranchParsed && nbBranchParsed > 0 ? nbBranchParsed : nbRun;
  const branchCfMm = 0.5 * nbBranch + 100;

  const explicitLength = item.length;
  const runLengthMm =
    explicitLength && explicitLength > 0 ? explicitLength : 2 * (0.5 * nbRun + 100);

  const pipeFlangeCount = countFlangesFromConfig(item.flangeConfig);
  const flangedEnds = pipeFlangeCount > 0 ? 2 + stubCount : 0;
  const flangeAllowanceMm = flangedEnds * 100;

  const developedLengthMm = runLengthMm + stubCount * branchCfMm + flangeAllowanceMm;
  const externalM2 = (Math.PI * odRun * developedLengthMm) / 1e6;
  const internalM2 = idRun > 0 ? (Math.PI * idRun * developedLengthMm) / 1e6 : 0;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return asResult({ externalM2, internalM2, quantity });
}

/**
 * Parses a stub count from a manifold description. Accepts "3-way", "3
 * stubs", "manifold × 3", "manifold x 3". Returns null when not found —
 * caller falls back to a sensible default (2).
 */
function parseStubCountFromDescription(desc: string | null): number | null {
  if (!desc) return null;
  const wayMatch = desc.match(/(\d+)[\s-]*(?:way|stub|stubs)/i);
  if (wayMatch) {
    const n = Number(wayMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const xMatch = desc.match(/manifold[\s-]*[x×*][\s-]*(\d+)/i);
  if (xMatch) {
    const n = Number(xMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Standalone flange — two annular faces (front + back) + the outer edge.
 * Outer-diameter and thickness are not in the schema; we approximate from
 * SABS 1123 / ASME B16.5 fits: `OD_flange ≈ 1.6×NB + 60 mm`, thickness
 * `t ≈ 0.04×NB + 20 mm`. The bore is the pipe OD that the flange faces
 * onto. No internal area (flanges are not internally lined).
 */
function flangeArea(item: QuoteItem, nbToOdMap: Record<number, number>): ItemSurfaceArea | null {
  const nb = item.diameter;
  if (nb === null || nb <= 0) return null;
  const odPipe = outerDiameterFromNB(nbToOdMap, nb);
  if (odPipe <= 0) return null;
  const odFlange = 1.6 * nb + 60;
  const thickness = 0.04 * nb + 20;
  const faceArea = ringArea(odFlange, odPipe);
  const edgeArea = (Math.PI * odFlange * thickness) / 1e6;
  const externalM2 = 2 * faceArea + edgeArea;
  const internalM2 = 0;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return asResult({ externalM2, internalM2, quantity });
}

/**
 * Equal-Y / wye — three cylindrical arms meeting at 45°. Each arm runs
 * roughly `1.5 × OD` from the centroid. The intersection geometry is non-
 * trivial; for quoting purposes we sum three arm surfaces and subtract a
 * small overlap (one OD-disc per joint).
 */
function equalYArea(
  item: QuoteItem,
  nbToOdMap: Record<number, number>,
  scheduleWallMap?: ScheduleWallMap,
): ItemSurfaceArea | null {
  const nb = item.diameter;
  if (nb === null || nb <= 0) return null;
  const odMm = outerDiameterFromNB(nbToOdMap, nb);
  if (odMm <= 0) return null;
  const wt = effectiveWallMm(item, nb, scheduleWallMap);
  const idMm = wt > 0 ? odMm - 2 * wt : 0;
  const explicitLength = item.length;
  const armLenMm = explicitLength && explicitLength > 0 ? explicitLength : 1.5 * odMm;
  const externalArm = (Math.PI * odMm * armLenMm) / 1e6;
  const externalOverlap = (Math.PI * odMm * odMm) / 4 / 1e6;
  const externalM2 = 3 * externalArm - 2 * externalOverlap;
  const internalM2 =
    idMm > 0
      ? (3 * (Math.PI * idMm * armLenMm)) / 1e6 - (2 * (Math.PI * idMm * idMm)) / 4 / 1e6
      : 0;
  const quantity = item.quantity > 0 ? item.quantity : 1;
  return asResult({ externalM2, internalM2, quantity });
}

/**
 * Computes coating (external) + lining (internal) m² for a single Nix-extracted
 * quote item by delegating to the shared pipe calculator. The Nix extraction
 * shape carries primitive dimensions (NB, WT, L, flange config) but no OD —
 * OD is resolved through the canonical `nbToOdMap` (TanStack-cached, fed by
 * the backend's flange-weight tables).
 *
 * Flange end detection mirrors the strings the Gemini extractor emits today:
 *   F.B.E F/F   → flanged both ends, flat-on-flat — 2 flanges
 *   F.B.E       → flanged both ends — 2 flanges
 *   P.E.        → plain ends — 0 flanges
 *   F.O.E       → flanged one end — 1 flange
 *   B.W.        → butt-weld ends — 0 flanges
 * Anything else is treated as 'no flange' so the area is just the bare pipe;
 * the calculator's flange allowance only kicks in for actual flange counts.
 *
 * Returns null when the item lacks the data needed (no length, no
 * diameter) — callers should render '—' in that case rather than a
 * misleading zero. A missing wall thickness is NOT a blocker: it falls
 * back to the SCH.STD approximation (schedule-only pipes like "HVY").
 */
export function surfaceAreaForQuoteItem(
  item: QuoteItem,
  nbToOdMap: Record<number, number>,
  options?: { liningWrapsOverPlainEnds?: boolean; scheduleWallMap?: ScheduleWallMap },
): ItemSurfaceArea | null {
  const scheduleWallMap = options ? options.scheduleWallMap : undefined;
  // Dispatch by fitting kind first — fittings have their own formulas and
  // don't share the cylinder-with-length requirement that pipes need.
  const kind = classifyFitting(item);
  if (kind === "bend_90") return bendArea(item, 90, nbToOdMap, scheduleWallMap);
  if (kind === "bend_45") return bendArea(item, 45, nbToOdMap, scheduleWallMap);
  if (kind === "bend_180") return bendArea(item, 180, nbToOdMap, scheduleWallMap);
  if (kind === "reducer") return reducerArea(item, nbToOdMap, scheduleWallMap);
  if (kind === "tee") return teeArea(item, nbToOdMap, scheduleWallMap);
  if (kind === "manifold") return manifoldArea(item, nbToOdMap, scheduleWallMap);
  if (kind === "flange") return flangeArea(item, nbToOdMap);
  if (kind === "equal_y") return equalYArea(item, nbToOdMap, scheduleWallMap);

  const itemDiameter = item.diameter;
  const itemLengthMm = item.length;
  if (itemDiameter === null || itemLengthMm === null) return null;
  if (itemDiameter <= 0 || itemLengthMm <= 0) return null;

  const dn = itemDiameter;
  const odMm = outerDiameterFromNB(nbToOdMap, dn);
  // Wall thickness falls back to the SCH.STD approximation when the
  // drawing gave only a schedule designation ("HVY", "MED", "SCH.STD")
  // and no numeric WT — the same effectiveWallMm fallback the fitting
  // formulas use. Previously the pipe branch hard-rejected a null
  // wallThickness, so a "100NB x HVY Pipe" row produced NO m² at all
  // even though external area (π × OD × L) never needed the wall.
  const itemWall = effectiveWallMm(item, dn, scheduleWallMap);
  const idMm = odMm - 2 * itemWall;
  if (idMm <= 0) return null;

  const lengthM = itemLengthMm / 1000;
  const flangeCount = countFlangesFromConfig(item.flangeConfig);
  const quantity = item.quantity > 0 ? item.quantity : 1;

  // P.E. pipes in dual-spec (coating + lining) pools: the rubber lining
  // wraps over each end onto the outside of the pipe, 100 mm per end. So
  // the lining covers (pipe length + 200 mm) and the coating loses those
  // same 200 mm — the rubber sits on the outside there, paint can't.
  // Confirmed by Andrew 2026-05-13: see drawing -04 on DOC080526.pdf.
  const wrapFlag = options ? options.liningWrapsOverPlainEnds : undefined;
  const wantsWrapOver = wrapFlag === true;
  if (wantsWrapOver && flangeCount === 0) {
    const externalLengthM = Math.max(0, lengthM - 0.2);
    const internalLengthM = lengthM + 0.2;
    const externalM2 = Math.PI * (odMm / 1000) * externalLengthM;
    const internalM2 = Math.PI * (idMm / 1000) * internalLengthM;
    return asResult({ externalM2, internalM2, quantity });
  }

  const raw = calculateTotalSurfaceArea({
    outsideDiameterMm: odMm,
    insideDiameterMm: idMm,
    individualPipeLengthM: lengthM,
    numberOfPipes: quantity,
    hasFlangeEnd1: flangeCount >= 1,
    hasFlangeEnd2: flangeCount >= 2,
    dn,
  });

  // Stock-control quote convention (user-confirmed 2026-05-11): the 100 mm-
  // per-flange-end length extension already accounts for the paint / lining
  // overlap onto the flange face, so adding the back-of-flange annular ring
  // on top would double-count the same area. Strip the flange-ring fields
  // from both the per-pipe result and the quantity-multiplied totals so the
  // quote shows bare-pipe surface area only:
  //   external = π × OD × (L + 0.1 × flangeCount)
  //   internal = π × ID × (L + 0.1 × flangeCount)
  //
  // The underlying calculator stays untouched because the RFQ surface-
  // protection export still consumes the flange-ring contributions today —
  // when they're ready to switch over we'll promote this stripping logic
  // into a shared `bareLateralAreaOnly` flag on the calculator.
  const perPipe = {
    ...raw.perPipe,
    externalFlangeBackAreaM2: 0,
    internalFlangeFaceAreaM2: 0,
    totalExternalAreaM2: raw.perPipe.externalPipeAreaM2,
    totalInternalAreaM2: raw.perPipe.internalPipeAreaM2,
    totalSurfaceAreaM2: raw.perPipe.externalPipeAreaM2 + raw.perPipe.internalPipeAreaM2,
  };
  return {
    perPipe,
    total: {
      totalExternalAreaM2: perPipe.totalExternalAreaM2 * quantity,
      totalInternalAreaM2: perPipe.totalInternalAreaM2 * quantity,
      totalSurfaceAreaM2: perPipe.totalSurfaceAreaM2 * quantity,
    },
  };
}

/**
 * Sums per-row totals across a list of items. Used by the pool footer to
 * show 'X m² total' for the pool, picking external / internal / total based
 * on what the pool's spec applies to (coating / lining / both).
 */
export function sumPoolTotals(rows: (ItemSurfaceArea | null)[]) {
  let totalExternal = 0;
  let totalInternal = 0;
  let totalCombined = 0;
  for (const row of rows) {
    if (!row) continue;
    totalExternal += row.total.totalExternalAreaM2;
    totalInternal += row.total.totalInternalAreaM2;
    totalCombined += row.total.totalSurfaceAreaM2;
  }
  return { totalExternal, totalInternal, totalCombined };
}

/**
 * Convention used across `pipeSurfaceArea.ts` and our running-metre lining
 * costing: each flanged end adds 100 mm of effective length to account for
 * the rubber / paint overlapping the flange face. Same constant as
 * `SURFACE_AREA_CONSTANTS.FLANGE_ALLOWANCE_M` from `@annix/product-data/pipe`.
 */
export const FLANGE_LENGTH_ALLOWANCE_M = 0.1;

/**
 * Effective lining length per pipe, in metres — includes the flange overlap
 * allowance. Returns 0 when the item has no length recorded. Used by the
 * rubber-lining 'over 3m → priced per running metre' pricing branch.
 */
export function effectiveLiningLengthM(item: QuoteItem): number {
  const lengthMm = item.length;
  if (lengthMm === null || lengthMm <= 0) return 0;
  const lengthM = lengthMm / 1000;
  const flangeCount = countFlangesFromConfig(item.flangeConfig);
  return lengthM + flangeCount * FLANGE_LENGTH_ALLOWANCE_M;
}

/**
 * True when the item should be priced per running metre rather than per m²
 * under the rubber-lining pricing schedule. Threshold matches the user's
 * spec (pipes >= 3 m) — fittings, plate work, and short pipes use the m²
 * rate instead.
 */
export function isLongPipeForLiningPricing(item: QuoteItem): boolean {
  if (item.itemType === null) return false;
  if (!/pipe/i.test(item.itemType)) return false;
  const lengthMm = item.length;
  if (lengthMm === null) return false;
  return lengthMm >= 3000;
}

export function countFlangesFromConfig(config: string | null): number {
  if (!config) return 0;
  const normalised = config.trim().toUpperCase();
  if (/^P\.?E\.?$/.test(normalised)) return 0;
  if (/^B\.?W\.?$/.test(normalised)) return 0;
  if (/F\.?B\.?E\.?/.test(normalised)) return 2;
  if (/F\.?O\.?E\.?/.test(normalised)) return 1;
  if (/F\/F/.test(normalised)) return 2;
  return 0;
}
