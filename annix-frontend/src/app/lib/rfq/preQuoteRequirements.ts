"use client";

// Pre-quote clarification helpers — drawing-reference detection and
// mining valve datasheet gap detection. Both produce a structured
// list the new wizard step (PreQuoteClarificationsStep) renders, and
// both feed buildClarificationEmailDraft() which produces a subject
// + body the customer can edit before sending.
//
// Drawing detection rule: any item description containing a token
// matching the JK-prefixed reference regex contributes the reference
// to missingDrawings (used by the clarifications email) if no
// uploaded document filename + no other extracted item carries the
// same reference. Substring match is case-insensitive so
// "Drawings_J528-303-110.pdf" counts as having the drawing.
//
// Pricing-dependency rule: an item is only added to flaggedItemIds
// (which the BOQ step omits from supplier pricing) when the drawing
// is load-bearing for pricing — i.e. the row text alone doesn't
// describe a priceable item. Straight pipes that cite a drawing for
// layout context but carry NB / wall thickness / flange spec / length
// in their description stay in the BOQ. Cast-in puddle pipes,
// fabricated spools, headers, manifolds and civil items still get
// omitted. See pricingRequiresDrawing() for the keyword set.
//
// Valve detection rule: items where itemType === "valve" OR a misc
// entry whose nixItemType === "valve" OR description matches valve
// keywords (gate / pinch / RSV / pump). Each detected valve is
// inspected against the mining datasheet field list — any field
// without a value joins the missingFields array for that valve.

import { isArray, isBoolean, isNumber, isObject, isString, keys } from "es-toolkit/compat";
import type { GlobalSpecs, PipeItem } from "@/app/lib/hooks/useRfqForm";

export interface MissingDrawing {
  ref: string;
  itemNumbers: string[];
}

export interface ValveSpecGap {
  itemId: string;
  itemNumber: string;
  description: string;
  missingFields: string[];
}

export interface ClarificationRequirements {
  missingDrawings: MissingDrawing[];
  valveSpecGaps: ValveSpecGap[];
  // Set of entry ids whose drawing references are missing — BOQStep
  // uses this to skip those rows from consolidation.
  flaggedItemIds: Set<string>;
}

export interface UploadedDocumentSummary {
  name: string;
}

const DRAWING_REF_REGEX = /\b(?:Dwg\s+)?([JK]\d{3,4}[-_/]\d{2,4}[-_/]\d{2,4})\b/gi;

const VALVE_KEYWORD_REGEX =
  /\b(valve|RSV|pinch\s*valve|gate\s*valve|globe\s*valve|ball\s*valve|butterfly\s*valve|check\s*valve|knife\s*valve|hand\s*pump|hydraulic\s*pump)\b/i;

// Markers that indicate an item's pricing genuinely depends on a
// drawing — geometry, embedment, layout, or fabrication detail that
// isn't captured by the row's text. If none of these match, the row
// is assumed priceable from its description (NB / wall / flange /
// length already stated) and stays in the BOQ even though a drawing
// is referenced. The drawing still flows into missingDrawings so the
// clarifications email asks the customer for it.
const PRICING_NEEDS_DRAWING_REGEX =
  /\b(cast[\s-]*in|puddle\s*pipe|spool|fabricated|formed\s*to\s*(?:layout|site)|as\s*per\s*(?:layout|site|drawing)|manifold|manhole|wash[\s-]*plate|thrust[\s-]*block|header\s*pipe|saddle\s*plate|field\s*measure)\b/i;

export const pricingRequiresDrawing = (item: PipeItem): boolean => {
  const description = item.description;
  if (!description) return false;
  return PRICING_NEEDS_DRAWING_REGEX.test(description);
};

// Mining datasheet field list — see CLAUDE.md memory or the v1.2.0
// commit message for the rationale behind each field. Display labels
// here are what the customer sees in the email + form. Keys map to
// fields on entry.specs (or the global rfqData) so the wizard can
// detect "filled" by checking for any defined value.
export const MINING_VALVE_DATASHEET_FIELDS: Array<{
  key: string;
  label: string;
  // Where the value lives — entry.specs.<key> (per-valve) or the
  // global RFQ form (cross-valve).
  scope: "entry" | "global";
  // Subsection grouping for the form layout.
  section: "process" | "mechanical" | "duty" | "standards" | "commercial";
  // True for slurry-only fields — only flagged when the customer has
  // marked the duty as slurry service.
  slurryOnly?: boolean;
}> = [
  // Section 2 — process conditions
  { key: "operatingMedia", label: "Process media", scope: "entry", section: "process" },
  { key: "isSlurry", label: "Slurry service Y/N", scope: "entry", section: "process" },
  {
    key: "solidsConcentrationPercent",
    label: "Solids concentration (%)",
    scope: "entry",
    section: "process",
    slurryOnly: true,
  },
  {
    key: "particleSizeMm",
    label: "Maximum particle size (mm)",
    scope: "entry",
    section: "process",
    slurryOnly: true,
  },
  {
    key: "specificGravity",
    label: "Specific gravity / density",
    scope: "entry",
    section: "process",
    slurryOnly: true,
  },
  { key: "ph", label: "pH", scope: "entry", section: "process" },
  {
    key: "operatingTemperatureC",
    label: "Operating temperature (°C)",
    scope: "entry",
    section: "process",
  },
  {
    key: "chlorideConcentrationPpm",
    label: "Chloride concentration (ppm)",
    scope: "entry",
    section: "process",
  },
  {
    key: "oxidisersPresent",
    label: "Dissolved O₂ / oxidisers present Y/N",
    scope: "entry",
    section: "process",
  },
  { key: "minFlowM3h", label: "Minimum flow (m³/h)", scope: "entry", section: "process" },
  { key: "normalFlowM3h", label: "Normal flow (m³/h)", scope: "entry", section: "process" },
  { key: "maxFlowM3h", label: "Maximum flow (m³/h)", scope: "entry", section: "process" },
  { key: "shutoffDeltaPBar", label: "Shut-off ΔP (bar)", scope: "entry", section: "process" },

  // Section 3 — mechanical
  { key: "size", label: "Valve size (NB)", scope: "entry", section: "mechanical" },
  {
    key: "pressureClass",
    label: "Pressure rating / PN class",
    scope: "entry",
    section: "mechanical",
  },
  {
    key: "flangeStandard",
    label: "Flange spec / SANS 1123 table",
    scope: "entry",
    section: "mechanical",
  },
  {
    key: "faceToFaceStandard",
    label: "Face-to-face standard",
    scope: "entry",
    section: "mechanical",
  },
  { key: "bodyMaterial", label: "Body / gate material", scope: "entry", section: "mechanical" },
  { key: "elastomer", label: "Seat / sleeve elastomer", scope: "entry", section: "mechanical" },
  {
    key: "flowDirection",
    label: "Flow direction (uni / bi-directional)",
    scope: "entry",
    section: "mechanical",
  },
  {
    key: "mountingOrientation",
    label: "Mounting orientation (vertical / horizontal)",
    scope: "entry",
    section: "mechanical",
  },
  {
    key: "reversePressureExpected",
    label: "Reverse pressure expected Y/N",
    scope: "entry",
    section: "mechanical",
  },
  { key: "actuatorType", label: "Manual or actuated", scope: "entry", section: "mechanical" },

  // Section 4 — duty profile
  {
    key: "dutyType",
    label: "Service type (isolation / control / modulating)",
    scope: "entry",
    section: "duty",
  },
  {
    key: "cycleFrequency",
    label: "Cycle frequency (cycles/day or year)",
    scope: "entry",
    section: "duty",
  },
  {
    key: "dischargeToAtmosphere",
    label: "Discharge to atmosphere Y/N",
    scope: "entry",
    section: "duty",
  },
  {
    key: "waterHammerExpected",
    label: "Water-hammer / surge expected Y/N",
    scope: "entry",
    section: "duty",
  },

  // Section 5 — standards
  {
    key: "leakageClass",
    label: "Leakage class (API 598 / ISO 5208)",
    scope: "entry",
    section: "standards",
  },
  {
    key: "mhsaSection21Required",
    label: "MHSA Section 21 CoC required Y/N",
    scope: "entry",
    section: "standards",
  },
  {
    key: "sans347PedRequired",
    label: "SANS 347 PED equivalent required Y/N",
    scope: "entry",
    section: "standards",
  },
  // Commercial section (required delivery date, site location, etc.)
  // is collected on Step 1 of the wizard — no need to repeat it on
  // the per-valve clarification form.
];

const isFilled = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (isString(value)) return value.trim().length > 0;
  if (isNumber(value)) return !Number.isNaN(value);
  if (isBoolean(value)) return true;
  if (isArray(value)) return value.length > 0;
  if (isObject(value)) return keys(value).length > 0;
  return false;
};

// Pull every drawing reference token out of an item description. A
// description can mention multiple drawings (cross-references like
// "as detailed on Dwg J528-303-110 / i) Cast in DN 630 HDPE..." that
// land in the BOQ's "Other Items" section).
const extractDrawingRefs = (text: string): string[] => {
  if (!text) return [];
  const matches = Array.from(text.matchAll(DRAWING_REF_REGEX));
  const refs = new Set<string>();
  matches.forEach((m) => {
    if (m[1]) refs.add(m[1].toUpperCase());
  });
  return Array.from(refs);
};

// True if the customer has uploaded any file whose name contains the
// reference (case-insensitive) OR if any other extracted item carries
// the reference in its drawingReference field. The latter handles
// the case where Nix already linked one item to a drawing — that
// linkage means the drawing exists in the customer's pack even if
// the filename doesn't echo the ref verbatim.
const drawingIsCovered = (
  ref: string,
  uploadedFilenames: string[],
  knownExtractionRefs: Set<string>,
): boolean => {
  const refLower = ref.toLowerCase();
  if (knownExtractionRefs.has(refLower)) return true;
  return uploadedFilenames.some((name) => name.toLowerCase().includes(refLower));
};

const isValveItem = (item: PipeItem): boolean => {
  if (item.itemType === "valve") return true;
  // Misc entries land here — they may carry productType=valve via
  // specs (set by the rfqWizardStore converter for Nix-extracted
  // valves) or have a valve keyword in the description.
  const rawSpecs: Record<string, unknown> | undefined = (
    item as { specs?: Record<string, unknown> }
  ).specs;
  if (rawSpecs?.nixItemType === "valve") return true;
  const rawDescription = item.description;
  const description = rawDescription || "";
  return VALVE_KEYWORD_REGEX.test(description);
};

// Valves (and pumps) on a fabrication / piping drawing are usually bought-out
// items supplied by the client or a valve/pump vendor, not the piping
// fabricator — the extractor tags those with a supply-scope caveat in the
// description (the same way instrument lines keep their "by others" note). A
// tagged valve is a reference line: it must NOT raise the full mining-valve
// datasheet clarification, because the user isn't pricing/supplying it. Only
// valves the documents explicitly place in the fabricator's supply (so the
// extractor leaves them untagged) ask for the datasheet.
const OUT_OF_SUPPLY_SCOPE_REGEX =
  /\bby\s+others\b|\bby\s+client\b|\bby\s+owner\b|\bby\s+instrumentation\b|\bfree[-\s]?issue\b|\bbought[-\s]?out\b|\b(?:confirm|verify)\s+(?:supply\s+)?scope\b|\bsupplied\s+by\s+(?:client|others|owner|instrumentation|vendor)\b|\bnot\s+in\s+(?:our\s+)?scope\b/i;

const isOutOfSupplyScope = (item: PipeItem): boolean => {
  const rawDescription = item.description;
  return OUT_OF_SUPPLY_SCOPE_REGEX.test(rawDescription || "");
};

const valveItemNumber = (item: PipeItem): string => {
  const rawClient = item.clientItemNumber;
  if (rawClient) return rawClient;
  return item.id;
};

// Decide the missing-fields list for a single valve. Slurry-only
// fields are skipped when the entry has explicitly set isSlurry to
// false. Otherwise (slurry undefined or true) we ask for them since
// not knowing the duty is itself a gap.
const computeValveGap = (item: PipeItem, globalSpecs: GlobalSpecs | undefined): string[] => {
  const rawSpecs: Record<string, unknown> | undefined = (
    item as { specs?: Record<string, unknown> }
  ).specs;
  const isSlurryValue = rawSpecs?.isSlurry;
  const slurryConfirmedNotSlurry = isSlurryValue === false;

  const missing: string[] = [];
  for (const field of MINING_VALVE_DATASHEET_FIELDS) {
    if (field.slurryOnly && slurryConfirmedNotSlurry) continue;
    const value =
      field.scope === "entry"
        ? rawSpecs?.[field.key]
        : (globalSpecs as Record<string, unknown> | undefined)?.[field.key];
    if (!isFilled(value)) {
      missing.push(field.label);
    }
  }
  return missing;
};

export function detectClarificationRequirements(
  items: PipeItem[],
  uploadedFilenames: string[],
  globalSpecs: GlobalSpecs | undefined,
): ClarificationRequirements {
  // First pass: collect every drawingReference Nix already linked
  // (these count as "covered") AND every reference that appears in
  // any item description.
  const knownExtractionRefs = new Set<string>();
  items.forEach((item) => {
    const rawSpecs: Record<string, unknown> | undefined = (
      item as { specs?: Record<string, unknown> }
    ).specs;
    const linkedRef = rawSpecs?.drawingReference;
    if (isString(linkedRef)) knownExtractionRefs.add(linkedRef.toLowerCase());
  });

  const drawingMap = new Map<string, { ref: string; itemNumbers: string[]; itemIds: string[] }>();
  const flaggedItemIds = new Set<string>();
  items.forEach((item) => {
    const rawItemDescription = item.description;
    const refs = extractDrawingRefs(rawItemDescription || "");
    if (refs.length === 0) return;
    const uncoveredRefs = refs.filter(
      (ref) => !drawingIsCovered(ref, uploadedFilenames, knownExtractionRefs),
    );
    if (uncoveredRefs.length === 0) return;
    const itemNumber = valveItemNumber(item);
    uncoveredRefs.forEach((ref) => {
      const existing = drawingMap.get(ref);
      if (existing) {
        if (!existing.itemNumbers.includes(itemNumber)) existing.itemNumbers.push(itemNumber);
        if (!existing.itemIds.includes(item.id)) existing.itemIds.push(item.id);
      } else {
        drawingMap.set(ref, {
          ref,
          itemNumbers: [itemNumber],
          itemIds: [item.id],
        });
      }
    });
    if (pricingRequiresDrawing(item)) {
      flaggedItemIds.add(item.id);
    }
  });

  const missingDrawings: MissingDrawing[] = Array.from(drawingMap.values())
    .map((entry) => ({ ref: entry.ref, itemNumbers: entry.itemNumbers }))
    .sort((a, b) => a.ref.localeCompare(b.ref));

  const valveSpecGaps: ValveSpecGap[] = items
    .filter(isValveItem)
    .filter((item) => !isOutOfSupplyScope(item))
    .map((item) => {
      const missingFields = computeValveGap(item, globalSpecs);
      const rawValveDescription = item.description;
      return {
        itemId: item.id,
        itemNumber: valveItemNumber(item),
        description: rawValveDescription || "(no description)",
        missingFields,
      };
    })
    .filter((gap) => gap.missingFields.length > 0)
    .sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));

  return {
    missingDrawings,
    valveSpecGaps,
    flaggedItemIds,
  };
}

export interface ClarificationEmailDraft {
  subject: string;
  body: string;
}

export interface ClarificationEmailContext {
  customerName: string | null;
  projectName: string | null;
  rfqReference: string | null;
  missingDrawings: MissingDrawing[];
  valveSpecGaps: ValveSpecGap[];
}

// Builds the editable plain-text email body the wizard step shows in
// a textarea. The backend re-renders this into the branded HTML when
// sending — the customer's edits flow through as the body's
// customNote OR as the subject override.
// v1.3.0 — drafts a short personal note the customer can edit
// before sending. The backend handles the boilerplate body
// (greeting, summary, CTA button to the form, link to PDF) so
// this textarea is now optional context the customer wants to
// add — not a full email draft. Most customers will leave it
// blank and just hit Send.
export function buildClarificationEmailDraft(
  context: ClarificationEmailContext,
): ClarificationEmailDraft {
  const refLabel = context.rfqReference ? ` (${context.rfqReference})` : "";
  const subject = `Pre-quote clarifications required${
    context.projectName ? ` — ${context.projectName}` : ""
  }${refLabel}`;

  const summaryFragments: string[] = [];
  if (context.missingDrawings.length > 0) {
    summaryFragments.push(
      `${context.missingDrawings.length} drawing reference${context.missingDrawings.length === 1 ? "" : "s"}`,
    );
  }
  if (context.valveSpecGaps.length > 0) {
    summaryFragments.push(
      `${context.valveSpecGaps.length} valve item${context.valveSpecGaps.length === 1 ? "" : "s"} needing mining-grade specifications`,
    );
  }
  const summary = summaryFragments.length > 0 ? summaryFragments.join(" and ") : "a few items";

  // Default body is a one-paragraph summary the customer can edit
  // (or replace entirely). The backend's branded template adds the
  // greeting, CTA button, PDF mention and sign-off — what the
  // customer types here flows through as a personal note.
  const body = `We're working through your tender and need clarification on ${summary} before we can put a meaningful price together. The link in this email opens a one-page form — should take a couple of minutes. (A fillable PDF is attached too if you'd rather work offline.)`;

  return { subject, body };
}

// Helper used by the wizard step to figure out whether the
// clarifications page can be auto-skipped. Returns true when the
// customer has nothing to clarify.
export function hasNoClarifications(req: ClarificationRequirements): boolean {
  return req.missingDrawings.length === 0 && req.valveSpecGaps.length === 0;
}
