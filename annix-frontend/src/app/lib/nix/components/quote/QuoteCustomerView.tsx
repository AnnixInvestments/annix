"use client";

import { toPairs as entries, isObject, isString } from "es-toolkit/compat";
import { useEffect, useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { fromISO } from "@/app/lib/datetime";
import { useSpecLookup } from "@/app/lib/nix/components/draft";
import {
  type NixExtractionSessionDto,
  type QuoteCustomerSnapshot,
  type QuoteEditorStateDto,
  type QuoteNotesDto,
  type QuotePdfSnapshotDto,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import { useStockControlCustomer } from "@/app/lib/query/hooks/stock-control";
import { poolItemsBySpec, type QuoteItem, type QuotePool } from "./poolItemsBySpec";
import {
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
  surfaceAreaForQuoteItem,
} from "./surfaceAreaForQuoteItem";

const SOUTH_AFRICA_VAT_RATE = 0.15;

/**
 * Customer-facing render of a Nix-promoted quote, laid out in the
 * Polymer Liners style. Print-friendly via CSS; same data as the working
 * QuoteView but stripped of the editor affordances.
 *
 * Sections:
 *   - Letterhead with supplier branding
 *   - Quotation number + page indicator
 *   - "To:" customer block
 *   - Account / Date / Order No / Delivery Note / Our Reference strip
 *   - Item table per pool with Code / Description / Qty / Price (Excl) /
 *     Tax / Total (Incl) columns
 *   - EXT: / INT: spec lines inline below each section's items
 *   - Free-text notes per section + general notes
 *   - Totals at bottom right (Excl / Tax / Incl)
 */
export function QuoteCustomerView(props: {
  session: NixExtractionSessionDto;
  /**
   * Fires whenever the computed PDF snapshot changes. The preview page
   * captures the latest snapshot in a ref so the Download / Email buttons
   * can post it to the backend without re-running the pricing math.
   */
  onSnapshotChange?: (snapshot: QuotePdfSnapshotDto) => void;
}) {
  const { session, onSnapshotChange } = props;
  const sessionExtractions = session.extractions;
  const drawingExtractions = useMemo(
    () => (sessionExtractions ?? []).filter((e) => e.documentRole === "drawing"),
    [sessionExtractions],
  );
  const specExtractions = useMemo(
    () => (sessionExtractions ?? []).filter((e) => e.documentRole === "specification"),
    [sessionExtractions],
  );
  const specLookup = useSpecLookup(specExtractions, drawingExtractions);

  const pools = useMemo(
    () => poolItemsBySpec(drawingExtractions, specLookup),
    [drawingExtractions, specLookup],
  );

  const nbToOdQuery = useNbToOdMap();
  const nbToOdData = nbToOdQuery.data;
  const nbToOdMap = useMemo(() => nbToOdData ?? {}, [nbToOdData]);
  const isAreaReady = !nbToOdQuery.isLoading;

  // Customer-facing — hide unscoped items (matches PolymerLining mode).
  const scopedPools = useMemo(() => pools.filter((p) => !p.isNoScope), [pools]);

  // Hydrate editor state from the saved bundle so unit prices match what
  // the quoter sees in the editor.
  const savedEditor = session.quoteEditorState;
  const specOverrides: SpecOverrides = useMemo(() => {
    const raw = savedEditor && isObject(savedEditor) ? savedEditor.overrides : null;
    return raw && isObject(raw) ? (raw as SpecOverrides) : {};
  }, [savedEditor]);
  const specRates: SpecRates = useMemo(() => {
    const raw = savedEditor && isObject(savedEditor) ? savedEditor.rates : null;
    return raw && isObject(raw) ? (raw as SpecRates) : {};
  }, [savedEditor]);

  const uniqueSpecs = useMemo<SpecListing[]>(() => {
    const map = new Map<string, SpecListing>();
    for (const pool of scopedPools) {
      if (pool.coating && !map.has(pool.coating)) {
        map.set(pool.coating, {
          code: pool.coating,
          kind: "coating",
          resolved: pool.coatingResolved,
          isManuallyAdded: false,
        });
      }
      if (pool.lining && !map.has(pool.lining)) {
        map.set(pool.lining, {
          code: pool.lining,
          kind: "lining",
          resolved: pool.liningResolved,
          isManuallyAdded: false,
        });
      }
    }
    return Array.from(map.values());
  }, [scopedPools]);
  const specByCode = useMemo(() => {
    const map = new Map<string, SpecListing>();
    for (const spec of uniqueSpecs) map.set(spec.code, spec);
    return map;
  }, [uniqueSpecs]);

  // Compute per-pool item rows + costs and roll up to the grand subtotal.
  const poolRows = useMemo(() => {
    return scopedPools.map((pool) => {
      const itemAreas = isAreaReady
        ? pool.items.map((item) => surfaceAreaForQuoteItem(item, nbToOdMap))
        : pool.items.map(() => null);
      const coatingRate = lookupSpecRate(specRates, pool.coating);
      const liningRate = lookupSpecRate(specRates, pool.lining);
      const items = pool.items.map((item, idx) => {
        const area = itemAreas[idx];
        const unitPrice = unitPriceForItem(item, area, pool, coatingRate, liningRate);
        const lineExcl = unitPrice * Math.max(item.quantity, 0);
        return {
          item,
          area,
          unitPrice,
          lineExcl,
          lineTax: lineExcl * SOUTH_AFRICA_VAT_RATE,
          lineIncl: lineExcl * (1 + SOUTH_AFRICA_VAT_RATE),
        };
      });
      const poolExcl = items.reduce((acc, row) => acc + row.lineExcl, 0);
      return { pool, items, poolExcl };
    });
  }, [scopedPools, specRates, isAreaReady, nbToOdMap]);

  const subtotalExcl = poolRows.reduce((acc, r) => acc + r.poolExcl, 0);
  const totalTax = subtotalExcl * SOUTH_AFRICA_VAT_RATE;
  const totalIncl = subtotalExcl + totalTax;

  // Live customer: prefer the master row (latest) over the snapshot.
  const rawCustomerCompanyId = session.customerCompanyId;
  const customerCompanyId: number | null =
    rawCustomerCompanyId === undefined || rawCustomerCompanyId === null
      ? null
      : rawCustomerCompanyId;
  const liveCustomer = useStockControlCustomer(customerCompanyId);
  const liveData = liveCustomer.data;
  const rawSnapshot = session.customerSnapshot;
  const snapshot: QuoteCustomerSnapshot | null =
    rawSnapshot === undefined || rawSnapshot === null ? null : rawSnapshot;
  const customer: QuoteCustomerSnapshot | null = useMemo(() => {
    if (customerCompanyId !== null && liveData) {
      return {
        name: liveData.name,
        customerCode: liveData.customerCode,
        contactPerson: liveData.contactPerson,
        email: liveData.email,
        phone: liveData.phone,
        vatNumber: liveData.vatNumber,
        registrationNumber: liveData.registrationNumber,
        streetAddress: liveData.streetAddress,
        city: liveData.city,
        province: liveData.province,
        postalCode: liveData.postalCode,
        country: liveData.country,
      };
    }
    return snapshot;
  }, [customerCompanyId, liveData, snapshot]);

  const notes: QuoteNotesDto = useMemo(() => {
    const raw = session.quoteNotes;
    if (!raw || !isObject(raw)) return { perPool: {}, generalAfterItems: "" };
    const perPoolRaw = (raw as Partial<QuoteNotesDto>).perPool;
    const perPool: Record<string, string> = {};
    if (perPoolRaw && isObject(perPoolRaw)) {
      for (const [k, v] of entries(perPoolRaw)) {
        if (isString(v)) perPool[k] = v;
      }
    }
    const general = (raw as Partial<QuoteNotesDto>).generalAfterItems;
    return {
      perPool,
      generalAfterItems: isString(general) ? general : "",
    };
  }, [session.quoteNotes]);

  const formattedDate = formatQuoteDate(session.createdAt);
  const rawPromotedRef = session.promotedRef;
  const quoteRef = rawPromotedRef ? rawPromotedRef : "—";

  const pdfSnapshot = useMemo<QuotePdfSnapshotDto>(() => {
    const pools = poolRows.map(({ pool, items }) => {
      const noteCandidate = notes.perPool[pool.key];
      const note = isString(noteCandidate) ? noteCandidate : "";
      return {
        key: pool.key,
        coatingLine: describeSpec(pool.coating, specByCode, specOverrides),
        liningLine: describeSpec(pool.lining, specByCode, specOverrides),
        note,
        items: items.map(({ item, unitPrice, lineExcl, lineTax, lineIncl }) => ({
          mark: String(item.mark),
          description: itemDescription(item),
          quantity: item.quantity,
          unitPrice,
          lineExcl,
          lineTax,
          lineIncl,
        })),
      };
    });
    return {
      pools,
      generalNotes: notes.generalAfterItems,
      subtotalExcl,
      totalTax,
      totalIncl,
    };
  }, [poolRows, specByCode, specOverrides, notes, subtotalExcl, totalTax, totalIncl]);

  useEffect(() => {
    if (onSnapshotChange) onSnapshotChange(pdfSnapshot);
  }, [pdfSnapshot, onSnapshotChange]);

  const auth = useStockControlAuth();
  const profile = auth.profile;
  const letterhead = useMemo<LetterheadInfo>(() => {
    if (!profile) {
      return {
        companyName: null,
        logoUrl: null,
        addressLine: null,
        registrationNumber: null,
        vatNumber: null,
        phone: null,
        email: null,
      };
    }
    const street = profile.streetAddress;
    const city = profile.city;
    const postal = profile.postalCode;
    const addressParts: string[] = [];
    if (street && street.length > 0) addressParts.push(street);
    if (city && city.length > 0) addressParts.push(city);
    if (postal && postal.length > 0) addressParts.push(postal);
    const addressLine = addressParts.length > 0 ? addressParts.join(", ") : null;
    return {
      companyName: profile.companyName,
      logoUrl: profile.logoUrl,
      addressLine,
      registrationNumber: profile.registrationNumber,
      vatNumber: profile.vatNumber,
      phone: profile.phone,
      email: profile.companyEmail,
    };
  }, [profile]);

  const accountCode: string | null =
    customer && customer.customerCode ? customer.customerCode : null;
  const rawOrderNumber = session.customerOrderNumber;
  const rawDeliveryNote = session.deliveryNoteRef;

  return (
    <article className="bg-white text-gray-900 max-w-[850px] mx-auto p-8 print:p-0 print:max-w-none">
      <Letterhead quoteRef={quoteRef} info={letterhead} />
      <CustomerToBlock customer={customer} />
      <HeaderStrip
        accountCode={accountCode}
        date={formattedDate}
        orderNumber={rawOrderNumber === undefined || rawOrderNumber === null ? "" : rawOrderNumber}
        deliveryNote={
          rawDeliveryNote === undefined || rawDeliveryNote === null ? "" : rawDeliveryNote
        }
        ourReference={quoteRef}
      />
      <ItemsTable
        poolRows={poolRows}
        specByCode={specByCode}
        specOverrides={specOverrides}
        notes={notes}
      />
      {notes.generalAfterItems.length > 0 && (
        <p className="whitespace-pre-line text-sm text-gray-800 mt-4 mb-2">
          {notes.generalAfterItems}
        </p>
      )}
      <TotalsBlock subtotalExcl={subtotalExcl} totalTax={totalTax} totalIncl={totalIncl} />
    </article>
  );
}

interface LetterheadInfo {
  companyName: string | null;
  logoUrl: string | null;
  addressLine: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  phone: string | null;
  email: string | null;
}

function Letterhead(props: { quoteRef: string; info: LetterheadInfo }) {
  const { info } = props;
  const nameValue = info.companyName;
  const displayName = nameValue && nameValue.length > 0 ? nameValue : "—";
  return (
    <header className="border-b-2 border-gray-300 pb-4 mb-4 flex items-start justify-between">
      <div className="flex items-start gap-3">
        {info.logoUrl ? (
          // biome-ignore lint/performance/noImgElement: remote tenant logo URL, no Next domain config
          <img
            src={info.logoUrl}
            alt={`${displayName} logo`}
            className="w-16 h-16 object-contain rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
            LOGO
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold tracking-wide uppercase">{displayName}</h1>
          {info.addressLine && <p className="text-xs text-gray-600 mt-1">{info.addressLine}</p>}
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-xl font-bold tracking-wide">Quotation {props.quoteRef}</h2>
        <p className="text-xs text-gray-500 mt-1">Page 1 of 1</p>
        <div className="text-[10px] text-gray-600 mt-3 space-y-0.5">
          {info.registrationNumber && <p>Reg: {info.registrationNumber}</p>}
          {info.vatNumber && <p>Tax Registration: {info.vatNumber}</p>}
          {info.phone && <p>Telephone: {info.phone}</p>}
          {info.email && <p>{info.email}</p>}
        </div>
      </div>
    </header>
  );
}

function CustomerToBlock(props: { customer: QuoteCustomerSnapshot | null }) {
  const { customer } = props;
  if (!customer) {
    return (
      <section className="border border-amber-300 bg-amber-50 rounded p-3 mb-4 text-sm text-amber-800">
        No customer assigned — add one before sending the quote.
      </section>
    );
  }
  const addressParts = [
    customer.streetAddress,
    customer.city,
    customer.province,
    customer.postalCode,
    customer.country,
  ].filter((p): p is string => Boolean(p && p.length > 0));
  return (
    <section className="mb-4">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">To:</p>
      {customer.customerCode && (
        <p className="text-xs font-mono text-gray-700 uppercase">{customer.customerCode}</p>
      )}
      <p className="text-sm font-semibold uppercase">{customer.name}</p>
      {addressParts.map((line) => (
        <p key={line} className="text-xs text-gray-700">
          {line}
        </p>
      ))}
      {customer.email && <p className="text-xs text-gray-700 mt-1">{customer.email}</p>}
    </section>
  );
}

function HeaderStrip(props: {
  accountCode: string | null;
  date: string;
  orderNumber: string;
  deliveryNote: string;
  ourReference: string;
}) {
  const { accountCode, date, orderNumber, deliveryNote, ourReference } = props;
  return (
    <section className="border-y border-gray-300 grid grid-cols-5 text-xs mb-3">
      <HeaderCell label="Account" value={accountCode ?? "—"} />
      <HeaderCell label="Date" value={date} />
      <HeaderCell label="Order No" value={orderNumber || "—"} />
      <HeaderCell label="Delivery Note" value={deliveryNote || "—"} />
      <HeaderCell label="Our Reference" value={ourReference} />
    </section>
  );
}

function HeaderCell(props: { label: string; value: string }) {
  return (
    <div className="px-2 py-1 border-r border-gray-200 last:border-r-0">
      <span className="block text-[9px] uppercase tracking-wider text-gray-500">{props.label}</span>
      <span className="block font-mono">{props.value}</span>
    </div>
  );
}

function ItemsTable(props: {
  poolRows: ReturnType<typeof buildPoolRowsDummy>;
  specByCode: Map<string, SpecListing>;
  specOverrides: SpecOverrides;
  notes: QuoteNotesDto;
}) {
  const { poolRows, specByCode, specOverrides, notes } = props;
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-gray-400">
          <th className="text-left py-1.5 px-1 font-semibold w-[6%]">Item Code</th>
          <th className="text-left py-1.5 px-1 font-semibold w-[42%]">Item Description</th>
          <th className="text-right py-1.5 px-1 font-semibold w-[8%]">Quantity</th>
          <th className="text-right py-1.5 px-1 font-semibold w-[14%]">Price (Excl)</th>
          <th className="text-right py-1.5 px-1 font-semibold w-[12%]">Tax</th>
          <th className="text-right py-1.5 px-1 font-semibold w-[18%]">Total (Incl)</th>
        </tr>
      </thead>
      <tbody>
        {poolRows.map(({ pool, items }) => {
          const coatingLine = describeSpec(pool.coating, specByCode, specOverrides);
          const liningLine = describeSpec(pool.lining, specByCode, specOverrides);
          const poolNote = notes.perPool[pool.key];
          return (
            <PoolGroupRows
              key={pool.key}
              items={items}
              coatingLine={coatingLine}
              liningLine={liningLine}
              note={poolNote || ""}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function PoolGroupRows(props: {
  items: ReturnType<typeof buildPoolRowsDummy>[number]["items"];
  coatingLine: string | null;
  liningLine: string | null;
  note: string;
}) {
  const { items, coatingLine, liningLine, note } = props;
  return (
    <>
      {items.map(({ item, lineExcl, lineTax, lineIncl, unitPrice }) => (
        <tr key={`${item.sourceExtractionId}-${item.mark}`} className="border-b border-gray-100">
          <td className="py-1 px-1 font-mono text-gray-700">{item.mark}</td>
          <td className="py-1 px-1">{itemDescription(item)}</td>
          <td className="py-1 px-1 text-right font-mono">{item.quantity.toFixed(2)}</td>
          <td className="py-1 px-1 text-right font-mono">
            {unitPrice > 0 ? formatZar(unitPrice) : "—"}
          </td>
          <td className="py-1 px-1 text-right font-mono">
            {lineExcl > 0 ? formatZar(lineTax) : "—"}
          </td>
          <td className="py-1 px-1 text-right font-mono font-semibold">
            {lineExcl > 0 ? formatZar(lineIncl) : "—"}
          </td>
        </tr>
      ))}
      {liningLine && (
        <tr className="border-b border-transparent">
          <td colSpan={6} className="px-1 pt-1 text-[11px] text-gray-700 uppercase tracking-wide">
            INT : {liningLine}
          </td>
        </tr>
      )}
      {coatingLine && (
        <tr className="border-b border-gray-300">
          <td colSpan={6} className="px-1 pb-1 text-[11px] text-gray-700 uppercase tracking-wide">
            EXT : {coatingLine}
          </td>
        </tr>
      )}
      {note.length > 0 && (
        <tr className="border-b border-gray-300">
          <td colSpan={6} className="px-1 py-1 text-xs whitespace-pre-line text-gray-800">
            {note}
          </td>
        </tr>
      )}
    </>
  );
}

function TotalsBlock(props: { subtotalExcl: number; totalTax: number; totalIncl: number }) {
  const { subtotalExcl, totalTax, totalIncl } = props;
  return (
    <section className="mt-6 flex justify-end">
      <div className="min-w-[18rem]">
        <div className="flex justify-between text-sm py-1 border-b border-gray-200">
          <span>Total (Excl)</span>
          <span className="font-mono">{formatZar(subtotalExcl)}</span>
        </div>
        <div className="flex justify-between text-sm py-1 border-b border-gray-200">
          <span>Tax</span>
          <span className="font-mono">{formatZar(totalTax)}</span>
        </div>
        <div className="flex justify-between text-base py-1.5 font-bold border-b-2 border-gray-900">
          <span>Total (Incl)</span>
          <span className="font-mono">{formatZar(totalIncl)}</span>
        </div>
      </div>
    </section>
  );
}

function describeSpec(
  code: string | null,
  specByCode: Map<string, SpecListing>,
  overrides: SpecOverrides,
): string | null {
  if (!code) return null;
  const spec = specByCode.get(code);
  if (!spec) return code;
  const all = effectiveSuppliers(spec, overrides);
  const selected = selectedSupplierId(spec, overrides);
  const customerFacing = suppliersForCustomerFooter(all, selected);
  if (customerFacing.length === 0) return null;
  return joinSuppliersForFooter(customerFacing, spec.kind);
}

function itemDescription(item: QuoteItem): string {
  const parts: string[] = [];
  if (item.diameter !== null) parts.push(`${item.diameter}NB`);
  if (item.length !== null) parts.push(`${item.length}LG`);
  // Prefer the human description ("Equal-Y", "Manifold", "90° Elbow") over
  // the schema's itemType enum — Gemini falls back to "other" whenever an
  // item doesn't fit a specific enum value (e.g. Equal-Y, wye), which would
  // render as "OTHER" on the customer-facing quote. Description is the
  // authoritative per-item label.
  const itemType = item.itemType;
  const itemDesc = item.description;
  const itemTypeSource = itemDesc ? itemDesc : itemType ? itemType : "Item";
  const typeWord = String(itemTypeSource).toUpperCase();
  parts.push(typeWord.includes("PIPE") ? "SPOOLS" : typeWord);
  if (item.flangeConfig) parts.push(item.flangeConfig);
  if (item.materialClass) parts.push(item.materialClass);
  return parts.join(" ");
}

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

function formatZar(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "R 0.00";
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQuoteDate(iso: string): string {
  const date = fromISO(iso);
  if (!date.isValid) return iso;
  return date.toFormat("yyyy/MM/dd");
}

// Type-helper so ItemsTable's prop type can refer to the row shape without
// duplicating the inline build expression — the actual builder is the
// per-pool useMemo inside QuoteCustomerView.
function buildPoolRowsDummy() {
  return [
    {
      pool: null as unknown as QuotePool,
      items: [
        {
          item: null as unknown as QuoteItem,
          area: null as unknown as ItemSurfaceArea | null,
          unitPrice: 0,
          lineExcl: 0,
          lineTax: 0,
          lineIncl: 0,
        },
      ],
      poolExcl: 0,
    },
  ];
}
