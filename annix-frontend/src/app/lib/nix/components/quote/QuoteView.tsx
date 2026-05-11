"use client";

import { useMemo, useState } from "react";
import { useSpecLookup } from "@/app/lib/nix/components/draft";
import { type NixExtractionSessionDto, useNbToOdMap } from "@/app/lib/query/hooks";
import { poolItemsBySpec, type QuoteItem, type QuotePool } from "./poolItemsBySpec";
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
import {
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
function unitPriceForItem(
  item: QuoteItem,
  area: ItemSurfaceArea | null,
  pool: QuotePool,
  coatingRate: SpecRate,
  liningRate: SpecRate,
): number {
  let unit = 0;
  if (pool.coating && coatingRate.perM2 > 0 && area) {
    unit += area.perPipe.totalExternalAreaM2 * coatingRate.perM2;
  }
  if (pool.lining) {
    if (isLongPipeForLiningPricing(item)) {
      if (liningRate.perRm > 0) {
        unit += effectiveLiningLengthM(item) * liningRate.perRm;
      }
    } else if (area && liningRate.perM2 > 0) {
      unit += area.perPipe.totalInternalAreaM2 * liningRate.perM2;
    }
  }
  return unit;
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

function coverageRowAreaM2(area: ItemSurfaceArea, kind: CoverageKind): number {
  if (kind === "external") return area.total.totalExternalAreaM2;
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
function coveragePerItemAreaM2(area: ItemSurfaceArea, kind: CoverageKind): number {
  const perPipe = area.perPipe;
  if (kind === "external") return perPipe.totalExternalAreaM2;
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

  const grandTotal = useMemo(() => {
    let total = 0;
    if (!isAreaReady) return 0;
    for (const pool of renderedPools) {
      const items = pool.items;
      const areas = items.map((item) => surfaceAreaForQuoteItem(item, nbToOdMap));
      const totals = sumPoolTotals(areas);
      const coatingRate = lookupSpecRate(specRates, pool.coating);
      const liningRate = lookupSpecRate(specRates, pool.lining);
      total += totals.totalExternal * coatingRate.perM2;
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

  return (
    <div className="space-y-6">
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
          />
        ))}

      <GrandTotalCard
        total={grandTotal}
        hasAnyRate={uniqueSpecs.some((s) => {
          const rate = lookupSpecRate(specRates, s.code);
          return rate.perM2 > 0 || rate.perRm > 0;
        })}
      />
    </div>
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
}) {
  const { pool, sectionNumber, nbToOdMap, isAreaReady, specRates, specOverrides, specByCode } =
    props;
  const coverageKind = coverageKindForPool(pool);
  const showAreaColumn = coverageKind !== "none";
  const headerLabel = coverageHeaderLabel(coverageKind);

  const itemAreas = useMemo(() => {
    if (!isAreaReady) return pool.items.map(() => null);
    return pool.items.map((item) => surfaceAreaForQuoteItem(item, nbToOdMap));
  }, [pool.items, nbToOdMap, isAreaReady]);
  const totals = useMemo(() => sumPoolTotals(itemAreas), [itemAreas]);
  const poolTotalM2 = (() => {
    if (coverageKind === "external") return totals.totalExternal;
    if (coverageKind === "internal") return totals.totalInternal;
    if (coverageKind === "total") return totals.totalCombined;
    return 0;
  })();

  const coatingRate = lookupSpecRate(specRates, pool.coating);
  const liningRate = lookupSpecRate(specRates, pool.lining);
  const coatingCost = totals.totalExternal * coatingRate.perM2;
  const liningBreakdown = useMemo(
    () => liningCostForPool(pool.items, itemAreas, liningRate),
    [pool.items, itemAreas, liningRate],
  );
  const poolCost = coatingCost + liningBreakdown.total;
  const showCost = poolCost > 0;
  const showPricingColumns =
    (pool.coating !== null && coatingRate.perM2 > 0) ||
    (pool.lining !== null && (liningRate.perM2 > 0 || liningRate.perRm > 0));
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
            <span className="font-semibold">{formatM2(poolTotalM2)}</span>{" "}
            <span className="text-gray-500">{headerLabel.toLowerCase()}</span>
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
            {showAreaColumn && (
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
              showAreaColumn={showAreaColumn}
              coverageKind={coverageKind}
              isAreaReady={isAreaReady}
              unitPrice={unitPrices[idx]}
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
                  {pool.coating}: {formatM2(totals.totalExternal)} × {formatZar(coatingRate.perM2)}
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
      </footer>
    </section>
  );
}

function ItemRow(props: {
  item: QuoteItem;
  area: ItemSurfaceArea | null;
  showAreaColumn: boolean;
  coverageKind: CoverageKind;
  isAreaReady: boolean;
  unitPrice: number;
  showPricingColumns: boolean;
}) {
  const { item, area, showAreaColumn, coverageKind, isAreaReady, unitPrice, showPricingColumns } =
    props;
  const dimensionParts: string[] = [];
  if (item.diameter !== null) dimensionParts.push(`NB ${item.diameter}`);
  if (item.wallThickness !== null) dimensionParts.push(`WT ${item.wallThickness}`);
  if (item.schedule) dimensionParts.push(item.schedule);
  if (item.length !== null) dimensionParts.push(`L ${item.length}`);
  const dimensions = dimensionParts.join(" × ");
  const flange = item.flangeConfig;
  const dimensionText = dimensions ? dimensions : "—";
  const materialClass = item.materialClass;
  const materialClassText = materialClass ? materialClass : "—";

  let perItemCellText = "—";
  let lineTotalCellText = "—";
  if (showAreaColumn) {
    if (!isAreaReady) {
      perItemCellText = "…";
      lineTotalCellText = "…";
    } else if (area) {
      perItemCellText = formatM2(coveragePerItemAreaM2(area, coverageKind));
      lineTotalCellText = formatM2(coverageRowAreaM2(area, coverageKind));
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 font-mono text-xs text-gray-700">{item.mark}</td>
      <td className="px-3 py-2 text-gray-900">{item.description}</td>
      <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
      <td className="px-3 py-2 text-gray-700">
        {dimensionText}
        {flange && (
          <span className="ml-2 text-[11px] text-gray-500 whitespace-nowrap">{flange}</span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-700 font-mono text-xs">{materialClassText}</td>
      {showAreaColumn && (
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
 * Format an m² figure with one decimal place — matches the precision the
 * shop quotes are calculated to. Quote-line m² figures are usually well
 * above 1, so a single decimal is enough resolution and reads cleaner than
 * '12.3456 m²'. Returns '—' for non-finite or zero, since 0 m² always
 * means we couldn't compute it (genuine zero-area items don't exist).
 */
function formatM2(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toFixed(1)} m²`;
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
  return detail ? `${code} — ${detail}` : code;
}
