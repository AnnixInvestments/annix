"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  RubberCureType,
  RubberPriceFamily,
  RubberQuoteCatalogItem,
  RubberQuoteResult,
} from "@/app/lib/api/stockControlApi";
import { useBranding, useCreateRubberQuote, useRubberQuoteCatalog } from "@/app/lib/query/hooks";

const FAMILY_TABS: { value: RubberPriceFamily; label: string }[] = [
  { value: "plate", label: "Plate" },
  { value: "pipe", label: "Running-metre Pipe" },
];

const BONDING_OPTIONS = [
  "Natural",
  "Premium Natural",
  "Chemical",
  "Butyl",
  "Nitrile",
  "Neoprene",
  "EPDM",
  "Cured",
];

const CURE_OPTIONS: { value: RubberCureType; label: string }[] = [
  { value: "steam", label: "Steam" },
  { value: "precured", label: "Pre-cured" },
  { value: "chemical", label: "Chemical" },
];

function cureLabel(value: RubberCureType | null): string {
  const option = CURE_OPTIONS.find((entry) => entry.value === value);
  return option ? option.label : "Unspecified";
}

const PIPE_NB_SIZES = [
  "50NB",
  "65NB",
  "80NB",
  "100NB",
  "125NB",
  "150NB",
  "200NB",
  "250NB",
  "300NB",
  "350NB",
  "400NB",
  "450NB",
  "500NB",
  "550NB",
  "600NB",
  "650NB",
  "700NB",
  "750NB",
  "800NB",
  "850NB",
  "900NB",
  "950NB",
  "1000NB",
];

function formatZar(value: number): string {
  return value.toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
}

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

export default function RubberQuotePage() {
  const [family, setFamily] = useState<RubberPriceFamily>("plate");
  const catalogQuery = useRubberQuoteCatalog(family);
  const createQuote = useCreateRubberQuote();
  const brandingQuery = useBranding("stock-control");

  const mutateAsync = createQuote.mutateAsync;

  const [compoundKey, setCompoundKey] = useState("");
  const [cureChoice, setCureChoice] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [thickness, setThickness] = useState("");
  const [nb, setNb] = useState("");
  const [areaOrLength, setAreaOrLength] = useState("");
  const [bonding, setBonding] = useState("");
  const [result, setResult] = useState<RubberQuoteResult | null>(null);

  const catalogData = catalogQuery.data;
  const catalog = useMemo(() => catalogData || [], [catalogData]);

  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  const supplierOptions = useMemo(
    () =>
      Array.from(new Set(catalog.map((item) => item.supplier).filter((name) => name !== ""))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [catalog],
  );

  const filteredCatalog = useMemo(
    () => catalog.filter((item) => supplierFilter === "all" || item.supplier === supplierFilter),
    [catalog, supplierFilter],
  );

  const compoundOptions = useMemo(() => {
    const byKey = filteredCatalog.reduce<Map<string, RubberQuoteCatalogItem>>(
      (accumulator, item) => {
        const key = `${item.supplier}::${item.productCode}`;
        const current = accumulator.get(key);
        if (!current || (item.preferred && !current.preferred)) {
          accumulator.set(key, item);
        }
        return accumulator;
      },
      new Map(),
    );
    return Array.from(byKey.entries())
      .map(([key, item]) => ({ key, item }))
      .sort((a, b) => a.item.supplier.localeCompare(b.item.supplier));
  }, [filteredCatalog]);

  const cureVariants = useMemo(
    () => filteredCatalog.filter((item) => `${item.supplier}::${item.productCode}` === compoundKey),
    [filteredCatalog, compoundKey],
  );

  const selectedItem = useMemo(() => {
    if (cureVariants.length === 0) {
      return null;
    }
    const byCure = cureVariants.find((item) => {
      const cure = item.cureType;
      return (cure ?? "") === cureChoice;
    });
    const preferred = cureVariants.find((item) => item.preferred === true);
    return byCure ?? preferred ?? cureVariants[0];
  }, [cureVariants, cureChoice]);

  const itemId = selectedItem ? selectedItem.id : null;

  const thicknessOptions = useMemo(() => {
    if (!selectedItem) {
      return [];
    }
    return selectedItem.thicknesses.map((entry) => entry.thicknessMm);
  }, [selectedItem]);

  useEffect(() => {
    const item = selectedItem;
    if (!item) {
      setBonding("");
      return;
    }
    const itemBonding = item.bondingType;
    setBonding(itemBonding ?? "");
  }, [selectedItem]);

  useEffect(() => {
    setResult(null);
  }, [family]);

  useEffect(() => {
    const stillVisible = compoundOptions.some((option) => option.key === compoundKey);
    if (compoundKey !== "" && !stillVisible) {
      setCompoundKey("");
      setCureChoice("");
      setResult(null);
    }
  }, [compoundOptions, compoundKey]);

  useEffect(() => {
    if (cureVariants.length === 0) {
      if (cureChoice !== "") {
        setCureChoice("");
      }
      return;
    }
    const hasChoice = cureVariants.some((item) => {
      const cure = item.cureType;
      return (cure ?? "") === cureChoice;
    });
    if (!hasChoice) {
      const preferred = cureVariants.find((item) => item.preferred === true);
      const fallback = preferred ?? cureVariants[0];
      const fallbackCure = fallback.cureType;
      setCureChoice(fallbackCure ?? "");
    }
  }, [cureVariants, cureChoice]);

  useEffect(() => {
    const options = thicknessOptions;
    if (options.length === 0) {
      setThickness("");
      return;
    }
    const current = Number(thickness);
    const hasCurrent = options.some((value) => value === current);
    if (!hasCurrent) {
      setThickness(String(options[options.length - 1]));
    }
  }, [thicknessOptions, thickness]);

  const thicknessNumber = Number(thickness);
  const areaNumber = Number(areaOrLength);
  const isPipe = family === "pipe";

  const canQuote =
    itemId != null &&
    Number.isFinite(thicknessNumber) &&
    thicknessNumber > 0 &&
    Number.isFinite(areaNumber) &&
    areaNumber > 0 &&
    (!isPipe || nb !== "");

  useEffect(() => {
    if (!canQuote || itemId == null) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const id = itemId;
    const selectedBonding = bonding === "" ? null : bonding;
    const selectedCure = selectedItem ? selectedItem.cureType : null;
    const timer = setTimeout(() => {
      mutateAsync({
        itemId: id,
        family,
        cureType: selectedCure,
        thicknessMm: thicknessNumber,
        nb: isPipe ? nb : null,
        areaOrLength: areaNumber,
        bondingType: selectedBonding,
      })
        .then((quote) => {
          if (!cancelled) {
            setResult(quote);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResult(null);
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    canQuote,
    itemId,
    family,
    selectedItem,
    thicknessNumber,
    nb,
    areaNumber,
    isPipe,
    bonding,
    mutateAsync,
  ]);

  const catalogLoading = catalogQuery.isLoading;
  const catalogError = catalogQuery.isError;
  const isEmpty = !catalogLoading && !catalogError && catalog.length === 0;

  const optionLabel = (item: RubberQuoteCatalogItem): string => {
    const name = item.productName;
    const suffix = name ? ` (${name})` : "";
    return `${item.supplier} — ${item.productCode}${suffix}`;
  };

  const hasCureChoice = cureVariants.length > 1;

  const resultSalePerUnit = result ? (isPipe ? result.salePerMetre : result.salePerM2) : null;
  const resultMpsPerUnit = result ? (isPipe ? result.mpsPerMetre : result.mpsPerM2) : null;
  const unitLabel = isPipe ? "metre" : "m²";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Quote</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick a rubber, thickness and area (plate) or length (pipe) to read off the live sale and
          MPS price. Quantities are applied here; supplier costs stay internal.
        </p>
      </div>

      {catalogLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          Loading catalogue…
        </div>
      )}

      {catalogError && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          Could not load the catalogue — please try again.
        </div>
      )}

      {isEmpty && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          No priced rubber available — add some in Rubber Lining Pricing.
        </div>
      )}

      {!catalogLoading && !catalogError && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            {FAMILY_TABS.map((tab) => {
              const isActive = tab.value === family;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFamily(tab.value)}
                  className={`px-4 py-1.5 text-sm font-medium ${
                    isActive ? "text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  style={isActive ? { backgroundColor: accentColor } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rubber-quote-supplier"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Supplier
              </label>
              <select
                id="rubber-quote-supplier"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="all">All suppliers</option>
                {supplierOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="rubber-quote-product"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rubber
              </label>
              <select
                id="rubber-quote-product"
                value={compoundKey}
                onChange={(e) => {
                  setCompoundKey(e.target.value);
                  setCureChoice("");
                }}
                className={INPUT_CLASS}
              >
                <option value="">Select a rubber…</option>
                {compoundOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {optionLabel(option.item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rubber-quote-cure"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cure type
              </label>
              <select
                id="rubber-quote-cure"
                value={cureChoice}
                onChange={(e) => setCureChoice(e.target.value)}
                disabled={compoundKey === "" || !hasCureChoice}
                className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
              >
                {cureVariants.map((item) => {
                  const cure = item.cureType;
                  const value = cure ?? "";
                  return (
                    <option key={item.id} value={value}>
                      {cureLabel(cure)}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Steam, pre-cured or chemical cure variant of this compound.
              </p>
            </div>

            <div>
              <label
                htmlFor="rubber-quote-bonding"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Bonding system
              </label>
              <select
                id="rubber-quote-bonding"
                value={bonding}
                onChange={(e) => setBonding(e.target.value)}
                disabled={itemId == null}
                className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">Default</option>
                {BONDING_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Price the same compound under a different bonding system.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="rubber-quote-thickness"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Thickness (mm)
              </label>
              <select
                id="rubber-quote-thickness"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                disabled={itemId == null}
                className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
              >
                <option value="">—</option>
                {thicknessOptions.map((value) => (
                  <option key={value} value={String(value)}>
                    {value} mm
                  </option>
                ))}
              </select>
            </div>

            {isPipe && (
              <div>
                <label
                  htmlFor="rubber-quote-nb"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  NB size
                </label>
                <select
                  id="rubber-quote-nb"
                  value={nb}
                  onChange={(e) => setNb(e.target.value)}
                  disabled={itemId == null}
                  className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
                >
                  <option value="">Select NB…</option>
                  {PIPE_NB_SIZES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="rubber-quote-area"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {isPipe ? "Length (m)" : "Area (m²)"}
              </label>
              <input
                id="rubber-quote-area"
                type="number"
                min={0}
                inputMode="decimal"
                value={areaOrLength}
                onChange={(e) => setAreaOrLength(e.target.value)}
                disabled={itemId == null}
                placeholder={isPipe ? "e.g. 12" : "e.g. 8.5"}
                className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
              />
            </div>
          </div>

          {result && resultSalePerUnit != null && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sale / {unitLabel}</span>
                <span className="font-medium text-gray-900">{formatZar(resultSalePerUnit)}</span>
              </div>
              {resultMpsPerUnit != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">MPS / {unitLabel}</span>
                  <span className="font-medium text-gray-900">{formatZar(resultMpsPerUnit)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">MPS total</span>
                <span className="font-medium text-gray-900">{formatZar(result.mpsTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-xs uppercase tracking-wide text-gray-400">Line total</span>
                <span className="text-3xl font-bold" style={{ color: accentColor }}>
                  {formatZar(result.saleTotal)}
                </span>
              </div>
            </div>
          )}

          {!result && (
            <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
              Pick a rubber, thickness{isPipe ? ", NB size" : ""} and {isPipe ? "length" : "area"}{" "}
              to see the price.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
