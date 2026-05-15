"use client";

import { toPairs as entries, isObject, isString, keys } from "es-toolkit/compat";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSpecLookup } from "@/app/lib/nix/components/draft";
import {
  type NixExtractionSessionDto,
  type QuoteEditorStateDto,
  type QuoteNotesDto,
  useNbToOdMap,
  useSaveQuoteEditorState,
  useSaveQuoteNotes,
} from "@/app/lib/query/hooks";
import { CustomerCard } from "./CustomerCard";
import {
  findSupersededByDedup,
  poolItemsBySpec,
  type QuoteItem,
  type QuotePool,
  type SupersededExtractionSummary,
} from "./poolItemsBySpec";
import { QuoteMetaBar } from "./QuoteMetaBar";
import { QuoteSpecsEditor } from "./QuoteSpecsEditor";
import {
  type DataSheetAttachments,
  effectiveSuppliers,
  joinSuppliersForFooter,
  lookupSpecRate,
  type SpecListing,
  type SpecOverrides,
  type SpecRate,
  type SpecRates,
  selectedSupplierId,
  suppliersForCustomerFooter,
} from "./quoteSpecOverrides";
import { SubmitQuoteModal } from "./SubmitQuoteModal";
import {
  countFlangesFromConfig,
  effectiveLiningLengthM,
  type ItemSurfaceArea,
  isLongPipeForLiningPricing,
  sumPoolTotals,
  surfaceAreaForQuoteItem,
} from "./surfaceAreaForQuoteItem";

/**
 * Formats a Rand amount with thousands separators and 2 decimals — matches
 * the styling already used on the Quotations index page. Local helper so
 * QuoteView doesn't drag in app-specific formatters; if a third call site
 * appears, promote to `lib/datetime`-adjacent currency utilities.
 */
function formatZar(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "R 0.00";
  const formatted = value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R ${formatted}`;
}

/**
 * Picks the right label for the length dimension based on item type.
 * Bends / elbows store length as the C/F (centre-to-face) dimension —
 * display it as "C/F 705" rather than "L 705" so the customer reads it
 * the same way it was printed on the drawing. Everything else uses "L".
 */
export function lengthLabelForItem(item: QuoteItem): string {
  const haystack =
    `${item.itemType ? item.itemType : ""} ${item.description ? item.description : ""}`.toLowerCase();
  const isBend = /\belbow\b|\bbend\b|\b90[°\s]|\b45[°\s]|\b180[°\s]|\bu[\s-]?bend\b/.test(haystack);
  if (!isBend) return "L";
  // Offset / S-bends: the workshop sheet carries only an overall length,
  // not a centre-to-face dimension — keep "L". A normal 90° / 45° bend
  // has a C/F printed, so it labels as "C/F".
  const isOffsetBend = /\boffset\b|\bs[\s-]?bend\b/.test(haystack);
  return isOffsetBend ? "L" : "C/F";
}

/**
 * The 'Flange class' column previously rendered materialClass directly,
 * which produced two wrong outcomes Andrew flagged on 2026-05-15:
 *
 *  - P.E. items showed their pipe material spec (e.g. "SANS 719 Gr.B")
 *    under a flange-class heading, despite having no flanges at all.
 *  - Fittings showed the steel grade (e.g. "S355JR/SANS 719") which is
 *    the material spec, NOT the flange pressure rating.
 *
 * The real flange class lives in the drawing's SABS 1123 callout box
 * ("1000/3 SABS 1123", "4000/3 SABS 1123"), captured into the new
 * flangeClass field by extractions running the updated prompt. When
 * Gemini hasn't filled flangeClass yet (older extractions, items
 * pending Re-Extract), fall back to a SABS-pattern heuristic on
 * materialClass — accept "1000/3", "4000/3 SABS 1123" etc., reject
 * "SANS 719", "S355JR/...", "SABS62" which are pipe specs.
 *
 * P.E. / B.W. items always render "—" regardless of what either field
 * contains — no flanges means no flange class to report.
 */
function formatFlangeClassCell(item: QuoteItem): string {
  if (countFlangesFromConfig(item.flangeConfig) === 0) return "—";
  const explicit = item.flangeClass;
  if (explicit && explicit.trim().length > 0) return explicit;
  const material = item.materialClass;
  if (material && /^\d{3,4}\/\d(\s|$)/.test(material.trim())) {
    return material;
  }
  return "—";
}

/**
 * South African VAT rate as a fraction (15%). Quote totals split out the
 * VAT line explicitly: subtotal ex VAT, VAT @ 15%, total inc VAT. Centralised
 * so a future SARS rate change is a one-line edit.
 */
const SOUTH_AFRICA_VAT_RATE = 0.15;

/**
 * Per-item unit price (one unit, ex VAT) in ZAR, computed from the same
 * pricing schedule as the pool totals:
 *  - Coating contribution: per-pipe external m² × R/m².
 *  - Lining contribution, split by item type:
 *      • Pipe ≥ 3 m → effective running metres (length + 0.1 m × flange count)
 *        × R/Rm.
 *      • Plate / fitting / pipe < 3 m → per-pipe internal m² × R/m².
 *  - Both contributions sum for items that are coated AND lined.
 *
 * Returns 0 when no relevant rate is set or the item is missing dimensions.
 * Multiplying by item.quantity gives the line total ex VAT — and summing those
 * line totals matches the existing pool cost (verified against
 * liningCostForPool + coatingCost in PoolSection).
 */
/**
 * Per-pipe m² that the coating rate applies to. Usually the external
 * surface only — but when the signed drawing prints a CORROSION INT.
 * AND CORROSION EXT. callout for the same code (e.g. R2a items where
 * both faces get Plasite), the painted area doubles to cover both
 * surfaces. Detected via pool.coatingResolved.coatingSides set by
 * useSpecLookup from the drawing's INT/EXT fields.
 */
function coatingAreaPerPipeM2(area: ItemSurfaceArea, pool: QuotePool): number {
  const sides = pool.coatingResolved ? pool.coatingResolved.coatingSides : null;
  if (sides === "both") {
    return area.perPipe.totalExternalAreaM2 + area.perPipe.totalInternalAreaM2;
  }
  return area.perPipe.totalExternalAreaM2;
}

function coatingAreaTotalM2(area: ItemSurfaceArea, pool: QuotePool): number {
  const sides = pool.coatingResolved ? pool.coatingResolved.coatingSides : null;
  if (sides === "both") {
    return area.total.totalExternalAreaM2 + area.total.totalInternalAreaM2;
  }
  return area.total.totalExternalAreaM2;
}

function coatingUnitCost(
  area: ItemSurfaceArea | null,
  pool: QuotePool,
  coatingRate: SpecRate,
): number {
  const poolCoating = pool.coating;
  const rate = coatingRate.perM2;
  if (!poolCoating) return 0;
  if (rate <= 0) return 0;
  if (!area) return 0;
  return coatingAreaPerPipeM2(area, pool) * rate;
}

function liningUnitCost(
  item: QuoteItem,
  area: ItemSurfaceArea | null,
  pool: QuotePool,
  liningRate: SpecRate,
): number {
  const poolLining = pool.lining;
  if (!poolLining) return 0;
  if (isLongPipeForLiningPricing(item)) {
    const perRm = liningRate.perRm;
    if (perRm > 0) {
      return effectiveLiningLengthM(item) * perRm;
    }
    return 0;
  }
  const perM2 = liningRate.perM2;
  if (area && perM2 > 0) {
    return area.perPipe.totalInternalAreaM2 * perM2;
  }
  return 0;
}

function unitPriceForItem(
  item: QuoteItem,
  area: ItemSurfaceArea | null,
  pool: QuotePool,
  coatingRate: SpecRate,
  liningRate: SpecRate,
): number {
  return coatingUnitCost(area, pool, coatingRate) + liningUnitCost(item, area, pool, liningRate);
}

/**
 * 'Coverage kind' for a pool — drives which m² figure (external for
 * coating, internal for lining, total for both, none for unscoped) is the
 * relevant one to render in the m² column header / row / footer total.
 *
 * For Polymer Lining the relevant area drives pricing: a coated pipe is
 * priced on its external surface area, a lined pipe on its internal
 * surface area, and a both-coated-and-lined pipe on the sum of both.
 */
type CoverageKind = "external" | "internal" | "total" | "none";

function coverageKindForPool(pool: QuotePool): CoverageKind {
  const hasCoating = Boolean(pool.coating);
  const hasLining = Boolean(pool.lining);
  if (hasCoating && hasLining) return "total";
  if (hasCoating) return "external";
  if (hasLining) return "internal";
  return "none";
}

function coverageHeaderLabel(kind: CoverageKind): string {
  if (kind === "external") return "Coating m²";
  if (kind === "internal") return "Lining m²";
  if (kind === "total") return "Total m²";
  return "m²";
}

/**
 * Header for the per-row TOTAL column when there is also a per-item column
 * alongside it — the suffix '(line total)' disambiguates it from the
 * 'Per item m²' column without hiding the coverage kind from the quoter.
 */
function coverageLineTotalLabel(kind: CoverageKind): string {
  if (kind === "external") return "Coating m² (line total)";
  if (kind === "internal") return "Lining m² (line total)";
  if (kind === "total") return "Total m² (line total)";
  return "m² (line total)";
}

function coverageRowAreaM2(area: ItemSurfaceArea, kind: CoverageKind, pool: QuotePool): number {
  if (kind === "external") return coatingAreaTotalM2(area, pool);
  if (kind === "internal") return area.total.totalInternalAreaM2;
  return area.total.totalSurfaceAreaM2;
}

/**
 * Per-single-pipe area for the relevant coverage kind. This is the figure
 * the costing module multiplies by the rate-per-m² (per pool spec) and then
 * by quantity to produce the line total — exposed in the UI as a separate
 * column so a quoter can sanity-check the rate against the unit area without
 * dividing total / qty in their head.
 */
function coveragePerItemAreaM2(area: ItemSurfaceArea, kind: CoverageKind, pool: QuotePool): number {
  const perPipe = area.perPipe;
  if (kind === "external") return coatingAreaPerPipeM2(area, pool);
  if (kind === "internal") return perPipe.totalInternalAreaM2;
  return perPipe.totalSurfaceAreaM2;
}

interface LiningCostBreakdown {
  /** Total running metres across all 'over 3 m pipe' items (× quantity, with flange allowance). */
  rmTotal: number;
  /** Total m² across all 'plate / fitting / short pipe' items (× quantity). */
  m2Total: number;
  /** Cost contribution from the Rm branch. */
  rmCost: number;
  /** Cost contribution from the m² branch. */
  m2Cost: number;
  /** Sum of the two branches. */
  total: number;
}

/**
 * Splits a pool's items into the two rubber-lining pricing branches:
 *  - 'over 3 m pipe' items priced per running metre (length × perRm rate)
 *  - everything else (plate, fittings, pipes < 3 m) priced per m² (internal area × perM2 rate)
 *
 * Each item lands in exactly one branch — never both. Items missing dimensions
 * (no length / no NB) contribute 0 to whichever branch they fell into; they're
 * already shown as '—' in the m² column so the quoter has visibility.
 */
function liningCostForPool(
  items: QuoteItem[],
  areas: (ItemSurfaceArea | null)[],
  rate: SpecRate,
): LiningCostBreakdown {
  const totals = items.reduce(
    (acc, item, idx) => {
      const area = areas[idx];
      if (isLongPipeForLiningPricing(item)) {
        const quantity = item.quantity > 0 ? item.quantity : 1;
        return { ...acc, rmTotal: acc.rmTotal + effectiveLiningLengthM(item) * quantity };
      }
      if (area) {
        return { ...acc, m2Total: acc.m2Total + area.total.totalInternalAreaM2 };
      }
      return acc;
    },
    { rmTotal: 0, m2Total: 0 },
  );
  const rmCost = totals.rmTotal * rate.perRm;
  const m2Cost = totals.m2Total * rate.perM2;
  return {
    rmTotal: totals.rmTotal,
    m2Total: totals.m2Total,
    rmCost,
    m2Cost,
    total: rmCost + m2Cost,
  };
}

export interface QuoteViewProps {
  session: NixExtractionSessionDto;
  /**
   * When true (Polymer Lining mode), items with no coating + no lining are
   * hidden from the main quote and listed as a footnote — the painting/
   * lining shop doesn't quote them. When false (general fabrication / RFQ
   * mode), every pool is rendered in the main quote because the fabricator
   * supplies them either way.
   */
  hideNoScopeItems: boolean;
}

/**
 * Renders a Nix-extracted draft session as a customer-facing quote with
 * items pooled by coating + lining. Each pool is one section: a header,
 * the per-item rows (mark, description, qty, dimensions, material class,
 * flange config), and a footer line resolving the spec ('All above items
 * require: R1 — Stoncor: Carboguard 890 Aluminium @ 100-150μm…').
 *
 * Shared across apps via lib/nix/components/quote so the RFQ portal can
 * mount the same view with hideNoScopeItems=false to surface every line
 * to a general fabricator.
 */
export function QuoteView(props: QuoteViewProps) {
  const { session, hideNoScopeItems } = props;
  const sessionExtractions = session.extractions;
  const drawingExtractions = useMemo(() => {
    const list = sessionExtractions ? sessionExtractions : [];
    return list.filter((e) => e.documentRole === "drawing");
  }, [sessionExtractions]);
  const specExtractions = useMemo(() => {
    const list = sessionExtractions ? sessionExtractions : [];
    return list.filter((e) => e.documentRole === "specification");
  }, [sessionExtractions]);
  const specLookup = useSpecLookup(specExtractions, drawingExtractions);

  const pools = useMemo(
    () => poolItemsBySpec(drawingExtractions, specLookup),
    [drawingExtractions, specLookup],
  );
  const supersededSummary = useMemo(
    () => findSupersededByDedup(drawingExtractions),
    [drawingExtractions],
  );

  const nbToOdQuery = useNbToOdMap();
  const nbToOdData = nbToOdQuery.data;
  const nbToOdMap = useMemo(() => (nbToOdData ? nbToOdData : {}), [nbToOdData]);
  const isAreaReady = !nbToOdQuery.isLoading;

  const scopedPools = pools.filter((p) => !p.isNoScope);
  const noScopePools = pools.filter((p) => p.isNoScope);
  const noScopeItems = noScopePools.flatMap((p) => p.items);
  const renderedPools = hideNoScopeItems ? scopedPools : [...scopedPools, ...noScopePools];

  const uniqueSpecs = useMemo<SpecListing[]>(() => {
    const map = new Map<string, SpecListing>();
    for (const pool of renderedPools) {
      const coating = pool.coating;
      if (coating && !map.has(coating)) {
        map.set(coating, {
          code: coating,
          kind: "coating",
          resolved: pool.coatingResolved,
          isManuallyAdded: false,
        });
      }
      const lining = pool.lining;
      if (lining && !map.has(lining)) {
        map.set(lining, {
          code: lining,
          kind: "lining",
          resolved: pool.liningResolved,
          isManuallyAdded: false,
        });
      }
    }
    return Array.from(map.values());
  }, [renderedPools]);

  const [specRates, setSpecRates] = useState<SpecRates>({});
  const [specOverrides, setSpecOverrides] = useState<SpecOverrides>({});
  const [dataSheets, setDataSheets] = useState<DataSheetAttachments>({});
  const [quoteNotes, setQuoteNotes] = useState<QuoteNotesDto>(emptyNotes);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const lastSavedNotesRef = useRef<string>(JSON.stringify(emptyNotes()));
  const [persistenceStatus, setPersistenceStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  /**
   * Hydrated tracker — flips true once we've loaded the saved bundle into
   * local state. Save effect is skipped until then so the initial mount
   * doesn't blow away the persisted bundle with an empty state on first
   * render before hydration lands.
   */
  const hydratedRef = useRef(false);

  // Hydrate from the session's persisted bundle on first render where the
  // session is available. Runs exactly once per session id.
  useEffect(() => {
    if (hydratedRef.current) return;
    const saved = session.quoteEditorState;
    if (saved && isObject(saved)) {
      if (isObject(saved.overrides)) {
        setSpecOverrides(saved.overrides as SpecOverrides);
      }
      if (isObject(saved.rates)) {
        setSpecRates(saved.rates as SpecRates);
      }
      if (isObject(saved.attachments)) {
        setDataSheets(saved.attachments as DataSheetAttachments);
      }
    }
    const savedNotes = session.quoteNotes;
    if (savedNotes && isObject(savedNotes)) {
      const hydratedNotes = normaliseNotes(savedNotes as Partial<QuoteNotesDto>);
      setQuoteNotes(hydratedNotes);
      lastSavedNotesRef.current = JSON.stringify(hydratedNotes);
    }
    hydratedRef.current = true;
  }, [session.quoteEditorState]);

  // Stale-override auto-migration. When a coating override was saved BEFORE
  // the drawing-INT/EXT capability shipped, the override's suppliers carry
  // spec-PDF brand labels (Stoncor, Corrocoat, colour) even though the
  // signed drawing now demands Internal + External entries. Without this
  // migration the override stays sticky forever — the auto-save keeps
  // writing the spec-PDF shape back to the DB, and the customer-facing
  // footer never reflects the contractual paint scope (Andrew 2026-05-15:
  // the R2a items kept rendering 'Stoncor: Plasite 4550-S' even after
  // re-extract because the saved override never invalidated).
  //
  // Triggered once specLookup is ready AND hydration has run. Detects
  // any override whose resolved code now exposes a drawing-derived
  // 'Internal: … • External: …' productDescriptors shape but whose
  // suppliers don't carry matching 'Internal' / 'External' brands —
  // drops those override keys so defaultSuppliersForSpec rebuilds from
  // the current resolved shape on the next render.
  const overrideMigratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (overrideMigratedRef.current) return;
    const codesToDrop: string[] = [];
    for (const code of keys(specOverrides)) {
      const override = specOverrides[code];
      if (!override) continue;
      const resolved = specLookup.resolve(code);
      const descriptors = resolved ? resolved.productDescriptors : null;
      if (!descriptors) continue;
      const drawingShape =
        /^\s*Internal:\s/i.test(descriptors) || /\bExternal:\s/i.test(descriptors);
      if (!drawingShape) continue;
      const hasDrawingBrand = override.suppliers.some(
        (s) => s.brand === "Internal" || s.brand === "External",
      );
      if (!hasDrawingBrand) codesToDrop.push(code);
    }
    if (codesToDrop.length > 0) {
      setSpecOverrides((prev) => {
        const next = { ...prev };
        for (const code of codesToDrop) delete next[code];
        return next;
      });
    }
    overrideMigratedRef.current = true;
  }, [specOverrides, specLookup]);

  // Debounced auto-save: any change to the bundle schedules a 1-s save. If
  // another change lands in the window, the timer resets — Notion / Google-
  // Docs-style. Surfaces success / failure via persistenceStatus so the
  // header chip can render 'Saved' / 'Saving…' / 'Save failed'.
  const saveStateMutation = useSaveQuoteEditorState();
  const sessionId = session.id;
  const bundle: QuoteEditorStateDto = useMemo(
    () => ({
      overrides: specOverrides,
      rates: specRates,
      attachments: dataSheets,
    }),
    [specOverrides, specRates, dataSheets],
  );
  // Pending tracker for the beforeunload guard — true while the debounce is
  // still pending or the request is in flight. Cleared when the save returns.
  const pendingSaveRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) return;
    pendingSaveRef.current = true;
    setPersistenceStatus("saving");
    const handle = window.setTimeout(() => {
      saveStateMutation.mutate(
        { sessionId, state: bundle },
        {
          onSuccess: () => {
            pendingSaveRef.current = false;
            setPersistenceStatus("saved");
            window.setTimeout(() => {
              setPersistenceStatus((s) => (s === "saved" ? "idle" : s));
            }, 1500);
          },
          onError: () => {
            pendingSaveRef.current = false;
            setPersistenceStatus("error");
          },
        },
      );
    }, 1000);
    return () => {
      window.clearTimeout(handle);
    };
  }, [bundle, sessionId, saveStateMutation]);

  // Independent debounce track for free-text notes — saved as a single
  // JSONB payload via /nix/sessions/:id/notes. Separate from quoteEditorState
  // because notes change far less often and we don't want a textarea
  // keystroke to also re-save the entire supplier/rates bundle.
  const saveNotesMutation = useSaveQuoteNotes();
  const serialisedNotes = JSON.stringify(quoteNotes);
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (serialisedNotes === lastSavedNotesRef.current) return;
    const handle = window.setTimeout(() => {
      saveNotesMutation.mutate(
        { sessionId, quoteNotes },
        {
          onSuccess: () => {
            lastSavedNotesRef.current = serialisedNotes;
          },
        },
      );
    }, 1000);
    return () => {
      window.clearTimeout(handle);
    };
  }, [serialisedNotes, sessionId, saveNotesMutation, quoteNotes]);

  // Browser-native unsaved-changes guard: fires on tab close, refresh, or
  // back-button when the debounced save hasn't flushed yet. We don't try to
  // sync-flush on unload — the standard prompt is enough to give the quoter
  // a chance to wait a beat and try again.
  useEffect(() => {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (!pendingSaveRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, []);

  const grandTotal = useMemo(() => {
    let total = 0;
    if (!isAreaReady) return 0;
    for (const pool of renderedPools) {
      const items = pool.items;
      const wrap = Boolean(pool.coating) && Boolean(pool.lining);
      const areas = items.map((item) =>
        surfaceAreaForQuoteItem(item, nbToOdMap, { liningWrapsOverPlainEnds: wrap }),
      );
      const totals = sumPoolTotals(areas);
      const coatingRate = lookupSpecRate(specRates, pool.coating);
      const liningRate = lookupSpecRate(specRates, pool.lining);
      const bothSidesPaint =
        pool.coatingResolved !== null && pool.coatingResolved.coatingSides === "both";
      const coatingPoolArea = bothSidesPaint
        ? totals.totalExternal + totals.totalInternal
        : totals.totalExternal;
      total += coatingPoolArea * coatingRate.perM2;
      const liningBreakdown = liningCostForPool(items, areas, liningRate);
      total += liningBreakdown.total;
    }
    return total;
  }, [renderedPools, specRates, nbToOdMap, isAreaReady]);

  const specByCode = useMemo(() => {
    const map = new Map<string, SpecListing>();
    for (const spec of uniqueSpecs) map.set(spec.code, spec);
    return map;
  }, [uniqueSpecs]);

  if (drawingExtractions.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500">
        This draft has no drawing extractions to build a quote from.
      </div>
    );
  }

  // Hoist member-access reads off the session DTO before passing to the
  // CustomerCard / QuoteMetaBar — the SWC-safe pattern requires a plain
  // local identifier on the left of a nullish-fallback operator.
  const sessionCustomerCompanyId = session.customerCompanyId;
  const sessionCustomerSnapshot = session.customerSnapshot;
  const sessionPromotedRef = session.promotedRef;
  const sessionCustomerOrderNumber = session.customerOrderNumber;
  const sessionDeliveryNoteRef = session.deliveryNoteRef;
  const savedCustomerCompanyId = sessionCustomerCompanyId ?? null;
  const savedCustomerSnapshot = sessionCustomerSnapshot ?? null;
  const savedPromotedRef = sessionPromotedRef ?? null;
  const savedCustomerOrderNumber = sessionCustomerOrderNumber ?? null;
  const savedDeliveryNoteRef = sessionDeliveryNoteRef ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PersistenceChip status={persistenceStatus} />
      </div>
      {supersededSummary.length > 0 && <SupersededRevisionsBanner summary={supersededSummary} />}
      <CustomerCard
        sessionId={session.id}
        customerCompanyId={savedCustomerCompanyId}
        customerSnapshot={savedCustomerSnapshot}
      />
      <QuoteMetaBar
        sessionId={session.id}
        createdAt={session.createdAt}
        ourReference={savedPromotedRef}
        customerOrderNumber={savedCustomerOrderNumber}
        deliveryNoteRef={savedDeliveryNoteRef}
      />
      <QuoteSpecsEditor
        specs={uniqueSpecs}
        overrides={specOverrides}
        rates={specRates}
        attachments={dataSheets}
        onOverridesChange={setSpecOverrides}
        onRatesChange={setSpecRates}
        onAttachmentsChange={setDataSheets}
      />

      {scopedPools.map((pool, idx) => (
        <PoolSection
          key={pool.key}
          pool={pool}
          sectionNumber={idx + 1}
          nbToOdMap={nbToOdMap}
          isAreaReady={isAreaReady}
          specRates={specRates}
          specOverrides={specOverrides}
          specByCode={specByCode}
          note={resolveNote(quoteNotes.perPool, pool.key)}
          onNoteChange={(text) =>
            setQuoteNotes((prev) => ({
              ...prev,
              perPool: { ...prev.perPool, [pool.key]: text },
            }))
          }
        />
      ))}

      {hideNoScopeItems && noScopeItems.length > 0 && <NoScopeFootnote items={noScopeItems} />}

      {!hideNoScopeItems &&
        noScopePools.map((pool, idx) => (
          <PoolSection
            key={pool.key}
            pool={pool}
            sectionNumber={scopedPools.length + idx + 1}
            nbToOdMap={nbToOdMap}
            isAreaReady={isAreaReady}
            specRates={specRates}
            specOverrides={specOverrides}
            specByCode={specByCode}
            note={resolveNote(quoteNotes.perPool, pool.key)}
            onNoteChange={(text) =>
              setQuoteNotes((prev) => ({
                ...prev,
                perPool: { ...prev.perPool, [pool.key]: text },
              }))
            }
          />
        ))}

      <GeneralNotesEditor
        value={quoteNotes.generalAfterItems}
        onChange={(text) => setQuoteNotes((prev) => ({ ...prev, generalAfterItems: text }))}
      />

      <GrandTotalCard
        total={grandTotal}
        hasAnyRate={uniqueSpecs.some((s) => {
          const rate = lookupSpecRate(specRates, s.code);
          return rate.perM2 > 0 || rate.perRm > 0;
        })}
      />

      <div className="flex justify-end items-center gap-3">
        {session.jobCardId ? (
          <a
            href={`/stock-control/portal/job-cards/${session.jobCardId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#323288] border border-[#323288] rounded-md hover:bg-[#323288] hover:text-white"
          >
            View Job Card #{session.jobCardId}
          </a>
        ) : (
          <a
            href={`/stock-control/portal/quotations/quotes/${session.id}/preview?convert=1`}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#323288] border border-[#323288] rounded-md hover:bg-[#323288] hover:text-white"
            title="Create a Job Card pre-populated with this quote's items and customer details"
          >
            Convert to Job Card
          </a>
        )}
        <button
          type="button"
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center px-5 py-2.5 text-sm font-semibold bg-[#323288] text-white rounded-md shadow-sm hover:bg-[#2a2a73]"
        >
          Submit quote
        </button>
      </div>

      {showSubmitModal && (
        <SubmitQuoteModal sessionId={session.id} onClose={() => setShowSubmitModal(false)} />
      )}
    </div>
  );
}

function emptyNotes(): QuoteNotesDto {
  return { perPool: {}, generalAfterItems: "" };
}

function normaliseNotes(raw: Partial<QuoteNotesDto> | Record<string, unknown>): QuoteNotesDto {
  const perPoolRaw = (raw as Partial<QuoteNotesDto>).perPool;
  const perPool: Record<string, string> = {};
  if (perPoolRaw && isObject(perPoolRaw)) {
    for (const [key, value] of entries(perPoolRaw)) {
      if (isString(value)) perPool[key] = value;
    }
  }
  const general = (raw as Partial<QuoteNotesDto>).generalAfterItems;
  return {
    perPool,
    generalAfterItems: isString(general) ? general : "",
  };
}

function resolveNote(perPool: Record<string, string>, key: string): string {
  const candidate = perPool[key];
  return candidate ? candidate : "";
}

function SupersededRevisionsBanner(props: { summary: SupersededExtractionSummary[] }) {
  const rows = props.summary;
  const totalSkipped = rows.reduce((acc, r) => acc + r.skippedCount, 0);
  return (
    <section className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-900">
      <p className="font-semibold mb-1">
        Skipped {totalSkipped} duplicate item{totalSkipped === 1 ? "" : "s"} from older drawings
      </p>
      <ul className="space-y-0.5 ml-4 list-disc text-[13px]">
        {rows.map((row) => (
          <li key={row.extractionId}>
            <span className="font-medium">{row.documentName}</span> — {row.skippedCount} item
            {row.skippedCount === 1 ? "" : "s"} superseded by{" "}
            <span className="font-medium">{row.supersededBy.join(", ")}</span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-amber-800 mt-2">
        Only the newer revision&apos;s items are counted in the quote. Marks that don&apos;t match
        between drawings stay separate.
      </p>
    </section>
  );
}

function PersistenceChip(props: { status: "idle" | "saving" | "saved" | "error" }) {
  const { status } = props;
  if (status === "idle") return null;
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "✓ Saved"
        : "Save failed — your edits aren't persisted";
  const toneClass =
    status === "error"
      ? "bg-red-50 border-red-300 text-red-800"
      : status === "saved"
        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
        : "bg-gray-50 border-gray-300 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border ${toneClass}`}
    >
      {label}
    </span>
  );
}

function GrandTotalCard(props: { total: number; hasAnyRate: boolean }) {
  const { total, hasAnyRate } = props;
  if (!hasAnyRate) return null;
  const vat = total * SOUTH_AFRICA_VAT_RATE;
  const totalIncVat = total + vat;
  const vatPercent = (SOUTH_AFRICA_VAT_RATE * 100).toFixed(0);
  return (
    <section className="bg-emerald-50 border border-emerald-300 rounded-lg p-4">
      <header className="flex items-baseline justify-between border-b border-emerald-200/60 pb-2 mb-2">
        <h2 className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
          Quote total
        </h2>
        <p className="text-xs text-emerald-700/80">
          Coating m² × R/m² + lining items split: pipes ≥ 3 m at R/Rm, everything else at R/m².
        </p>
      </header>
      <div className="space-y-1 font-mono">
        <div className="flex items-baseline justify-between text-sm text-emerald-900">
          <span className="text-emerald-800/90 font-sans">Subtotal (ex VAT)</span>
          <span>{formatZar(total)}</span>
        </div>
        <div className="flex items-baseline justify-between text-sm text-emerald-900">
          <span className="text-emerald-800/90 font-sans">VAT @ {vatPercent}%</span>
          <span>{formatZar(vat)}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-emerald-300 pt-1.5 mt-1.5">
          <span className="text-emerald-900 font-sans font-semibold uppercase tracking-wider text-xs">
            Total (inc VAT)
          </span>
          <span className="text-2xl font-bold text-emerald-900">{formatZar(totalIncVat)}</span>
        </div>
      </div>
    </section>
  );
}

function PoolSection(props: {
  pool: QuotePool;
  sectionNumber: number;
  nbToOdMap: Record<number, number>;
  isAreaReady: boolean;
  specRates: SpecRates;
  specOverrides: SpecOverrides;
  specByCode: Map<string, SpecListing>;
  note: string;
  onNoteChange: (text: string) => void;
}) {
  const {
    pool,
    sectionNumber,
    nbToOdMap,
    isAreaReady,
    specRates,
    specOverrides,
    specByCode,
    note,
    onNoteChange,
  } = props;
  const coverageKind = coverageKindForPool(pool);
  const showAreaColumn = coverageKind !== "none";
  const headerLabel = coverageHeaderLabel(coverageKind);

  const liningWrapsOverPlainEnds = coverageKind === "total";
  const itemAreas = useMemo(() => {
    if (!isAreaReady) return pool.items.map(() => null);
    return pool.items.map((item) =>
      surfaceAreaForQuoteItem(item, nbToOdMap, { liningWrapsOverPlainEnds }),
    );
  }, [pool.items, nbToOdMap, isAreaReady, liningWrapsOverPlainEnds]);
  const totals = useMemo(() => sumPoolTotals(itemAreas), [itemAreas]);
  const coatingBothSides =
    pool.coatingResolved !== null && pool.coatingResolved.coatingSides === "both";
  const coatingPoolAreaM2 = coatingBothSides
    ? totals.totalExternal + totals.totalInternal
    : totals.totalExternal;
  const poolTotalM2 = (() => {
    if (coverageKind === "external") return coatingPoolAreaM2;
    if (coverageKind === "internal") return totals.totalInternal;
    if (coverageKind === "total") return totals.totalCombined;
    return 0;
  })();

  const coatingRate = lookupSpecRate(specRates, pool.coating);
  const liningRate = lookupSpecRate(specRates, pool.lining);
  const coatingCost = coatingPoolAreaM2 * coatingRate.perM2;
  const liningBreakdown = useMemo(
    () => liningCostForPool(pool.items, itemAreas, liningRate),
    [pool.items, itemAreas, liningRate],
  );
  const poolCost = coatingCost + liningBreakdown.total;
  const showCost = poolCost > 0;
  // Show the unit-price + line-total columns whenever the pool has a coating
  // or lining spec — even before the quoter has entered a rate, so the column
  // structure is visible and the rows show '—' until the rate is set. The
  // previous gate ('any rate > 0') hid the columns entirely on a fresh quote
  // and looked like the feature was missing.
  const showPricingColumns = pool.coating !== null || pool.lining !== null;
  const unitPrices = useMemo(
    () =>
      pool.items.map((item, idx) =>
        unitPriceForItem(item, itemAreas[idx], pool, coatingRate, liningRate),
      ),
    [pool.items, itemAreas, pool, coatingRate, liningRate],
  );

  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <header className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-baseline justify-between">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-700">
          Section {sectionNumber} — {pool.items.length} {pool.items.length === 1 ? "item" : "items"}
        </h3>
        {showAreaColumn && isAreaReady && (
          <span className="text-xs text-gray-700">
            {coverageKind === "total" ? (
              <>
                <span className="font-semibold">{formatM2(coatingPoolAreaM2)}</span>{" "}
                <span className="text-gray-500">coating m²</span>
                <span className="text-gray-400"> · </span>
                <span className="font-semibold">{formatM2(totals.totalInternal)}</span>{" "}
                <span className="text-gray-500">lining m²</span>
              </>
            ) : (
              <>
                <span className="font-semibold">{formatM2(poolTotalM2)}</span>{" "}
                <span className="text-gray-500">{headerLabel.toLowerCase()}</span>
              </>
            )}
          </span>
        )}
      </header>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium">Mark</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium text-right">Qty</th>
            <th className="px-3 py-2 font-medium">Dimensions</th>
            <th className="px-3 py-2 font-medium">Flange class</th>
            {showAreaColumn && coverageKind === "total" && (
              <>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  Coating m²
                  <span className="block text-[10px] font-normal text-gray-400">per item</span>
                </th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  Coating R
                  <span className="block text-[10px] font-normal text-gray-400">per item</span>
                </th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  Lining m²
                  <span className="block text-[10px] font-normal text-gray-400">per item</span>
                </th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  Lining R
                  <span className="block text-[10px] font-normal text-gray-400">per item</span>
                </th>
              </>
            )}
            {showAreaColumn && coverageKind !== "total" && (
              <>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Per item m²</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  {coverageLineTotalLabel(coverageKind)}
                </th>
              </>
            )}
            {showPricingColumns && (
              <>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  Unit price
                  <span className="block text-[10px] font-normal text-gray-400">ex VAT</span>
                </th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
                  Line total
                  <span className="block text-[10px] font-normal text-gray-400">ex VAT</span>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pool.items.map((item, idx) => (
            <ItemRow
              key={`${item.sourceExtractionId}-${item.mark}-${idx}`}
              item={item}
              area={itemAreas[idx]}
              pool={pool}
              showAreaColumn={showAreaColumn}
              coverageKind={coverageKind}
              isAreaReady={isAreaReady}
              unitPrice={unitPrices[idx]}
              coatingPerItemCost={coatingUnitCost(itemAreas[idx], pool, coatingRate)}
              liningPerItemCost={liningUnitCost(item, itemAreas[idx], pool, liningRate)}
              showPricingColumns={showPricingColumns}
            />
          ))}
        </tbody>
      </table>
      <footer className="bg-emerald-50/40 border-t border-emerald-200 px-4 py-2 text-xs text-emerald-900 space-y-1">
        <div>
          <span className="font-semibold">All above items require: </span>
          {describeSpec(pool, specByCode, specOverrides)}
        </div>
        {showCost && (
          <div className="flex items-baseline justify-between gap-3 border-t border-emerald-200/60 pt-1">
            <span className="text-emerald-800/90">
              {coatingRate.perM2 > 0 && pool.coating && (
                <>
                  {pool.coating}: {formatM2(coatingPoolAreaM2)} × {formatZar(coatingRate.perM2)}
                  /m² = <span className="font-semibold">{formatZar(coatingCost)}</span>
                </>
              )}
              {coatingRate.perM2 > 0 &&
                liningBreakdown.total > 0 &&
                pool.coating &&
                pool.lining && <span className="text-emerald-700/70"> · </span>}
              {liningBreakdown.total > 0 && pool.lining && (
                <>
                  {pool.lining}:{" "}
                  {liningBreakdown.rmCost > 0 && (
                    <>
                      {liningBreakdown.rmTotal.toFixed(1)} Rm × {formatZar(liningRate.perRm)}/Rm
                    </>
                  )}
                  {liningBreakdown.rmCost > 0 && liningBreakdown.m2Cost > 0 && <span> + </span>}
                  {liningBreakdown.m2Cost > 0 && (
                    <>
                      {formatM2(liningBreakdown.m2Total)} × {formatZar(liningRate.perM2)}/m²
                    </>
                  )}{" "}
                  = <span className="font-semibold">{formatZar(liningBreakdown.total)}</span>
                </>
              )}
            </span>
            <span className="text-emerald-900 font-bold font-mono whitespace-nowrap">
              {formatZar(poolCost)}
            </span>
          </div>
        )}
        <PoolNoteEditor value={note} onChange={onNoteChange} />
      </footer>
    </section>
  );
}

/**
 * Per-section free-text textarea — quoter types banding instructions /
 * special-spool callouts here ("5 x SPOOLS TO BE BANDED AS FOLLOWS :- /
 * BAND 1 - GOLDEN YELLOW B49 / BAND 2 - MIDDLE BROWN B07"). The
 * customer-facing PDF renderer will surface this text under the section
 * footer.
 */
function PoolNoteEditor(props: { value: string; onChange: (text: string) => void }) {
  const { value, onChange } = props;
  return (
    <details className="border-t border-emerald-200/60 pt-1.5 mt-1" open={value.length > 0}>
      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-emerald-700 font-medium hover:text-emerald-900">
        Section notes {value.length > 0 ? "" : "(optional)"}
      </summary>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. 5 x SPOOLS TO BE BANDED AS FOLLOWS:&#10;BAND 1 - GOLDEN YELLOW B49&#10;BAND 2 - MIDDLE BROWN B07"
        rows={3}
        className="mt-1 w-full px-2 py-1 text-xs border border-emerald-200 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
      />
    </details>
  );
}

/**
 * The "everything-else" notes block — appears at the very bottom of the
 * items list, before the totals. Matches the example PDF's general
 * footnotes (e.g. "ITEMS 10-16 : NO BAND REQUIRED ON THESE SPECIAL
 * SPOOLS").
 */
function GeneralNotesEditor(props: { value: string; onChange: (text: string) => void }) {
  const { value, onChange } = props;
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3">
      <label className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-1">
        Notes for the customer (after items)
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. ITEMS 10-16 : NO BAND REQUIRED ON THESE SPECIAL SPOOLS"
        rows={3}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
      />
    </section>
  );
}

function ItemRow(props: {
  item: QuoteItem;
  area: ItemSurfaceArea | null;
  pool: QuotePool;
  showAreaColumn: boolean;
  coverageKind: CoverageKind;
  isAreaReady: boolean;
  unitPrice: number;
  /** Coating contribution to the unit price (per single item). 0 when no rate set. */
  coatingPerItemCost: number;
  /** Lining contribution to the unit price (per single item). 0 when no rate set. */
  liningPerItemCost: number;
  showPricingColumns: boolean;
}) {
  const {
    item,
    area,
    pool,
    showAreaColumn,
    coverageKind,
    isAreaReady,
    unitPrice,
    coatingPerItemCost,
    liningPerItemCost,
    showPricingColumns,
  } = props;
  const dimensionParts: string[] = [];
  if (item.diameter !== null) dimensionParts.push(`NB ${item.diameter}`);
  if (item.wallThickness !== null) dimensionParts.push(`WT ${item.wallThickness}`);
  if (item.schedule) dimensionParts.push(item.schedule);
  if (item.length !== null) dimensionParts.push(`${lengthLabelForItem(item)} ${item.length}`);
  const dimensions = dimensionParts.join(" × ");
  const flange = item.flangeConfig;
  const dimensionText = dimensions ? dimensions : "—";
  const flangeClassText = formatFlangeClassCell(item);

  let perItemCellText = "—";
  let lineTotalCellText = "—";
  let coatingPerItemText = "—";
  let liningPerItemText = "—";
  if (showAreaColumn) {
    if (!isAreaReady) {
      perItemCellText = "…";
      lineTotalCellText = "…";
      coatingPerItemText = "…";
      liningPerItemText = "…";
    } else if (area) {
      perItemCellText = formatM2(coveragePerItemAreaM2(area, coverageKind, pool));
      lineTotalCellText = formatM2(coverageRowAreaM2(area, coverageKind, pool));
      coatingPerItemText = formatM2(coatingAreaPerPipeM2(area, pool));
      liningPerItemText = formatM2(area.perPipe.totalInternalAreaM2);
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 font-mono text-xs text-gray-700">{item.mark}</td>
      <td className="px-3 py-2 text-gray-900">
        {item.description ? item.description.replace(/\bu[\s-]?tee\b/gi, "Unequal Tee") : ""}
      </td>
      <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
      <td className="px-3 py-2 text-gray-700">
        {dimensionText}
        {flange && (
          <span className="ml-2 text-[11px] text-gray-500 whitespace-nowrap">{flange}</span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-700 font-mono text-xs">{flangeClassText}</td>
      {showAreaColumn && coverageKind === "total" && (
        <>
          <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs whitespace-nowrap">
            {coatingPerItemText}
          </td>
          <td className="px-3 py-2 text-right text-gray-900 font-mono text-xs whitespace-nowrap">
            {coatingPerItemCost > 0 ? formatZar(coatingPerItemCost) : "—"}
          </td>
          <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs whitespace-nowrap">
            {liningPerItemText}
          </td>
          <td className="px-3 py-2 text-right text-gray-900 font-mono text-xs whitespace-nowrap">
            {liningPerItemCost > 0 ? formatZar(liningPerItemCost) : "—"}
          </td>
        </>
      )}
      {showAreaColumn && coverageKind !== "total" && (
        <>
          <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs whitespace-nowrap">
            {perItemCellText}
          </td>
          <td className="px-3 py-2 text-right text-gray-900 font-mono text-xs whitespace-nowrap">
            {lineTotalCellText}
          </td>
        </>
      )}
      {showPricingColumns && (
        <>
          <td className="px-3 py-2 text-right text-gray-700 font-mono text-xs whitespace-nowrap">
            {unitPrice > 0 ? formatZar(unitPrice) : "—"}
          </td>
          <td className="px-3 py-2 text-right text-gray-900 font-mono text-xs whitespace-nowrap">
            {unitPrice > 0 && item.quantity > 0 ? formatZar(unitPrice * item.quantity) : "—"}
          </td>
        </>
      )}
    </tr>
  );
}

/**
 * Format an m² figure with two decimal places. Short fittings (200 mm
 * stubs / reducers) can have per-item areas around 0.1 m² where a single
 * decimal hides real differences — a 0.07 m² and a 0.15 m² item both
 * showed as "0.1 m²" even though the cost doubled. Two decimals make the
 * per-item m² differences legible. Returns '—' for non-finite or zero,
 * since 0 m² always means we couldn't compute it.
 */
function formatM2(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toFixed(2)} m²`;
}

function NoScopeFootnote(props: { items: QuoteItem[] }) {
  const { items } = props;
  const marks = items.map((i) => i.mark).join(", ");
  return (
    <section className="bg-amber-50/40 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
      <p>
        <span className="font-semibold">Excluded from this quote:</span> {items.length}{" "}
        {items.length === 1 ? "item is" : "items are"} marked uncoated and unlined and fall outside
        the painting / lining scope of this quote. Marks: {marks}.
      </p>
    </section>
  );
}

/**
 * Builds the 'All above items require…' footer line by combining the
 * coating + lining specs. Override-aware: if the user has edited or added
 * supplier entries via QuoteSpecsEditor, those take precedence over the
 * Gemini-extracted ones — so deleting Corrocoat from R1 means the footer
 * shows Stoncor only, and adding a custom 'In-house' supplier shows that
 * brand too.
 */
function describeSpec(
  pool: QuotePool,
  specByCode: Map<string, SpecListing>,
  overrides: SpecOverrides,
): string {
  const parts: string[] = [];
  const coatingPart = describeFromSpec(pool.coating, specByCode, overrides);
  if (coatingPart) parts.push(coatingPart);
  const liningPart = describeFromSpec(pool.lining, specByCode, overrides);
  if (liningPart) parts.push(liningPart);
  if (parts.length === 0) return "no coating or lining specified";
  return parts.join(" + ");
}

function describeFromSpec(
  code: string | null,
  specByCode: Map<string, SpecListing>,
  overrides: SpecOverrides,
): string | null {
  if (!code) return null;
  const spec = specByCode.get(code);
  if (!spec) return code;
  const allSuppliers = effectiveSuppliers(spec, overrides);
  const selected = selectedSupplierId(spec, overrides);
  const customerFacing = suppliersForCustomerFooter(allSuppliers, selected);
  if (customerFacing.length === 0) return `${code} — (no products specified)`;
  const detail = joinSuppliersForFooter(customerFacing, spec.kind);

  // For linings, the "spec code" is itself a product name that Nix
  // extracted from the drawings (e.g. "Linatex Linard 60"). Once the
  // quoter has added a custom product (e.g. "AU Industries 60 Shore
  // Red…"), the extracted name is redundant and confusing — the
  // customer-facing line should read just the chosen product. Drop the
  // "<code> — " prefix when ANY supplier on a lining is a custom entry.
  // Coatings keep their prefix because R1 / R2a are real spec-class
  // identifiers, not product names.
  const hasCustomOverride = customerFacing.some((s) => s.isCustom);
  if (spec.kind === "lining" && hasCustomOverride && detail) {
    return detail;
  }
  return detail ? `${code} — ${detail}` : code;
}
