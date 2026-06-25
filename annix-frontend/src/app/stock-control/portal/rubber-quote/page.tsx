"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  RubberCureType,
  RubberPriceFamily,
  RubberQuoteCatalogItem,
  RubberQuoteResult,
} from "@/app/lib/api/stockControlApi";
import { useBranding, useCreateRubberQuote, useRubberQuoteCatalog } from "@/app/lib/query/hooks";

type QuoteMode = "single" | "compare";

const MODE_TABS: { value: QuoteMode; label: string }[] = [
  { value: "single", label: "Single quote" },
  { value: "compare", label: "Compare suppliers" },
];

const COMPARE_SUPPLIERS = ["AU", "Rema", "Truco", "Impilo"];

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

const BONDING_AGENT_SUPPLIERS = ["Ty-Ply", "Rema", "Impilo", "Megum"];

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

interface QuoteViewProps {
  family: RubberPriceFamily;
  catalog: RubberQuoteCatalogItem[];
  accentColor: string;
}

export default function RubberQuotePage() {
  const [mode, setMode] = useState<QuoteMode>("single");
  const [family, setFamily] = useState<RubberPriceFamily>("plate");
  const catalogQuery = useRubberQuoteCatalog(family);
  const brandingQuery = useBranding("annix-core");

  const catalogData = catalogQuery.data;
  const catalog = useMemo(() => catalogData || [], [catalogData]);

  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  const catalogLoading = catalogQuery.isLoading;
  const catalogError = catalogQuery.isError;
  const isEmpty = !catalogLoading && !catalogError && catalog.length === 0;

  return (
    <div className="max-w-5xl mx-auto">
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

      {!catalogLoading && !catalogError && !isEmpty && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
              {MODE_TABS.map((tab) => {
                const isActive = tab.value === mode;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setMode(tab.value)}
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
          </div>

          {mode === "single" ? (
            <SingleQuoteView family={family} catalog={catalog} accentColor={accentColor} />
          ) : (
            <CompareSuppliersView family={family} catalog={catalog} accentColor={accentColor} />
          )}
        </div>
      )}
    </div>
  );
}

function SingleQuoteView(props: QuoteViewProps) {
  const family = props.family;
  const catalog = props.catalog;
  const accentColor = props.accentColor;
  const createQuote = useCreateRubberQuote();
  const mutateAsync = createQuote.mutateAsync;

  const [compoundKey, setCompoundKey] = useState("");
  const [cureChoice, setCureChoice] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [thickness, setThickness] = useState("");
  const [nb, setNb] = useState("");
  const [areaOrLength, setAreaOrLength] = useState("");
  const [bonding, setBonding] = useState("");
  const [bondAgentSupplier, setBondAgentSupplier] = useState("");
  const [result, setResult] = useState<RubberQuoteResult | null>(null);

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
    const selectedAgentSupplier = bondAgentSupplier === "" ? null : bondAgentSupplier;
    const timer = setTimeout(() => {
      mutateAsync({
        itemId: id,
        family,
        cureType: selectedCure,
        thicknessMm: thicknessNumber,
        nb: isPipe ? nb : null,
        areaOrLength: areaNumber,
        bondingType: selectedBonding,
        bondingAgentSupplier: selectedAgentSupplier,
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
    bondAgentSupplier,
    mutateAsync,
  ]);

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
    <div className="space-y-5">
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

        <div>
          <label
            htmlFor="rubber-quote-bond-agent"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Bonding agent supplier
          </label>
          <select
            id="rubber-quote-bond-agent"
            value={bondAgentSupplier}
            onChange={(e) => setBondAgentSupplier(e.target.value)}
            disabled={itemId == null}
            className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">{isPipe ? "Default (Ty-Ply)" : "Default (Impilo)"}</option>
            {BONDING_AGENT_SUPPLIERS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Switch the adhesive supplier to compare the bonding cost.
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
          Pick a rubber, thickness{isPipe ? ", NB size" : ""} and {isPipe ? "length" : "area"} to
          see the price.
        </p>
      )}
    </div>
  );
}

interface CompareColumn {
  supplier: string;
  item: RubberQuoteCatalogItem | null;
  result: RubberQuoteResult | null;
  errored: boolean;
}

function sortedDistinct(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value !== ""))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function matchCompareItem(
  catalog: RubberQuoteCatalogItem[],
  supplier: string,
  bonding: string,
  shore: string,
  colour: string,
  cure: string,
): RubberQuoteCatalogItem | null {
  const matches = catalog.filter((item) => {
    if (item.supplier !== supplier) {
      return false;
    }
    const bondingValue = item.bondingType;
    const itemBonding = bondingValue ?? "";
    if (itemBonding !== bonding) {
      return false;
    }
    if (shore !== "") {
      const itemShore = item.shoreHardness;
      if (String(itemShore ?? "") !== shore) {
        return false;
      }
    }
    if (colour !== "") {
      const colourValue = item.colour;
      const itemColour = colourValue ?? "";
      if (itemColour !== colour) {
        return false;
      }
    }
    if (cure !== "") {
      const cureValue = item.cureType;
      const itemCure = cureValue ?? "";
      if (itemCure !== "" && itemCure !== cure) {
        return false;
      }
    }
    return true;
  });
  if (matches.length === 0) {
    return null;
  }
  const preferred = matches.find((item) => item.preferred === true);
  return preferred ?? matches[0];
}

function CompareSuppliersView(props: QuoteViewProps) {
  const family = props.family;
  const catalog = props.catalog;
  const accentColor = props.accentColor;
  const createQuote = useCreateRubberQuote();
  const mutateAsync = createQuote.mutateAsync;
  const toast = useToast();

  const [bonding, setBonding] = useState("");
  const [shore, setShore] = useState("");
  const [colour, setColour] = useState("");
  const [cure, setCure] = useState("");
  const [thickness, setThickness] = useState("");
  const [nb, setNb] = useState("");
  const [columns, setColumns] = useState<CompareColumn[]>([]);
  const [loading, setLoading] = useState(false);

  const isPipe = family === "pipe";
  const unitLabel = isPipe ? "m" : "m²";

  const bondingOptions = useMemo(
    () =>
      sortedDistinct(
        catalog.map((item) => {
          const value = item.bondingType;
          return value ?? "";
        }),
      ),
    [catalog],
  );

  const matchingBonding = useMemo(
    () =>
      catalog.filter((item) => {
        const value = item.bondingType;
        return (value ?? "") === bonding;
      }),
    [catalog, bonding],
  );

  const shoreOptions = useMemo(
    () =>
      sortedDistinct(
        matchingBonding.map((item) => {
          const value = item.shoreHardness;
          return String(value ?? "");
        }),
      ),
    [matchingBonding],
  );

  const colourOptions = useMemo(
    () =>
      sortedDistinct(
        matchingBonding.map((item) => {
          const value = item.colour;
          return value ?? "";
        }),
      ),
    [matchingBonding],
  );

  const cureOptions = useMemo(() => {
    const distinct = sortedDistinct(
      matchingBonding.map((item) => {
        const value = item.cureType;
        return value ?? "";
      }),
    );
    return CURE_OPTIONS.filter((option) => distinct.includes(option.value));
  }, [matchingBonding]);

  const thicknessOptions = useMemo(() => {
    const values = matchingBonding.flatMap((item) =>
      item.thicknesses.map((entry) => entry.thicknessMm),
    );
    return Array.from(new Set(values)).sort((a, b) => a - b);
  }, [matchingBonding]);

  useEffect(() => {
    setShore("");
    setColour("");
    setCure("");
    setThickness("");
    setColumns([]);
  }, [bonding]);

  useEffect(() => {
    setColumns([]);
  }, [family]);

  const thicknessNumber = Number(thickness);

  const matchedColumns = useMemo<CompareColumn[]>(
    () =>
      COMPARE_SUPPLIERS.map((supplier) => {
        const item =
          bonding === "" ? null : matchCompareItem(catalog, supplier, bonding, shore, colour, cure);
        return { supplier, item, result: null, errored: false };
      }),
    [catalog, bonding, shore, colour, cure],
  );

  const canQuote =
    bonding !== "" &&
    Number.isFinite(thicknessNumber) &&
    thicknessNumber > 0 &&
    (!isPipe || nb !== "") &&
    matchedColumns.some((column) => column.item != null);

  useEffect(() => {
    if (!canQuote) {
      setColumns(matchedColumns);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const nbValue = isPipe ? nb : null;
    const timer = setTimeout(() => {
      const tasks = matchedColumns.map((column) => {
        const item = column.item;
        if (!item) {
          return Promise.resolve<CompareColumn>({ ...column, result: null, errored: false });
        }
        const itemBonding = item.bondingType;
        const itemCure = item.cureType;
        return mutateAsync({
          itemId: item.id,
          family,
          cureType: itemCure,
          thicknessMm: thicknessNumber,
          nb: nbValue,
          areaOrLength: 1,
          bondingType: itemBonding ?? null,
        })
          .then((quote): CompareColumn => ({ ...column, result: quote, errored: false }))
          .catch((): CompareColumn => ({ ...column, result: null, errored: true }));
      });
      Promise.all(tasks)
        .then((resolved) => {
          if (cancelled) {
            return;
          }
          setColumns(resolved);
          setLoading(false);
          const anyErrored = resolved.some((column) => column.errored);
          if (anyErrored) {
            toast.showToast("Some suppliers could not be priced.", "error");
          }
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setColumns(matchedColumns.map((column) => ({ ...column, errored: column.item != null })));
          setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canQuote, matchedColumns, family, thicknessNumber, nb, isPipe, mutateAsync, toast]);

  const displayColumns = columns.length > 0 ? columns : matchedColumns;

  const cheapestSupplier = useMemo(() => {
    const priced = displayColumns.filter((column) => column.result != null);
    if (priced.length === 0) {
      return null;
    }
    const unitSale = (column: CompareColumn): number => {
      const quote = column.result;
      if (!quote) {
        return Number.POSITIVE_INFINITY;
      }
      const perUnit = isPipe ? quote.salePerMetre : quote.salePerM2;
      return perUnit ?? Number.POSITIVE_INFINITY;
    };
    const best = priced.reduce((lowest, column) =>
      unitSale(column) < unitSale(lowest) ? column : lowest,
    );
    return best.supplier;
  }, [displayColumns, isPipe]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="compare-bonding" className="block text-sm font-medium text-gray-700 mb-1">
            Rubber type
          </label>
          <select
            id="compare-bonding"
            value={bonding}
            onChange={(e) => setBonding(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Select rubber type…</option>
            {bondingOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="compare-shore" className="block text-sm font-medium text-gray-700 mb-1">
            Shore A
          </label>
          <select
            id="compare-shore"
            value={shore}
            onChange={(e) => setShore(e.target.value)}
            disabled={bonding === ""}
            className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">Any</option>
            {shoreOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="compare-colour" className="block text-sm font-medium text-gray-700 mb-1">
            Colour
          </label>
          <select
            id="compare-colour"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            disabled={bonding === ""}
            className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">Any</option>
            {colourOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="compare-cure" className="block text-sm font-medium text-gray-700 mb-1">
            Cure type
          </label>
          <select
            id="compare-cure"
            value={cure}
            onChange={(e) => setCure(e.target.value)}
            disabled={bonding === ""}
            className={`${INPUT_CLASS} disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">Any</option>
            {cureOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="compare-thickness"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Thickness (mm)
          </label>
          <select
            id="compare-thickness"
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
            disabled={bonding === ""}
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
            <label htmlFor="compare-nb" className="block text-sm font-medium text-gray-700 mb-1">
              NB size
            </label>
            <select
              id="compare-nb"
              value={nb}
              onChange={(e) => setNb(e.target.value)}
              disabled={bonding === ""}
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
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {displayColumns.map((column) => {
            const item = column.item;
            const quote = column.result;
            const isBest = quote != null && column.supplier === cheapestSupplier;
            const salePerUnit = quote ? (isPipe ? quote.salePerMetre : quote.salePerM2) : null;
            const mpsPerUnit = quote ? (isPipe ? quote.mpsPerMetre : quote.mpsPerM2) : null;
            return (
              <div
                key={column.supplier}
                className={`rounded-lg border p-3 ${
                  isBest ? "border-transparent ring-2" : "border-gray-200"
                }`}
                style={isBest ? { boxShadow: `0 0 0 2px ${accentColor}` } : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{column.supplier}</span>
                  {isBest && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide text-white rounded px-1.5 py-0.5"
                      style={{ backgroundColor: accentColor }}
                    >
                      Best
                    </span>
                  )}
                </div>
                {item == null ? (
                  <p className="text-xs text-gray-400">Not stocked</p>
                ) : loading ? (
                  <p className="text-xs text-gray-400">Pricing…</p>
                ) : quote == null ? (
                  <p className="text-sm text-gray-400">—</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400 truncate" title={item.productCode}>
                      {item.productCode}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Sale / {unitLabel}</span>
                      <span className="font-medium text-gray-900">
                        {salePerUnit != null ? formatZar(salePerUnit) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">MPS / {unitLabel}</span>
                      <span className="font-medium text-gray-900">
                        {mpsPerUnit != null ? formatZar(mpsPerUnit) : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Sale prices shown for comparison; supplier costs stay internal.
        </p>
      </div>

      {!canQuote && (
        <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
          Pick a rubber type and thickness{isPipe ? " and NB size" : ""} to compare suppliers.
        </p>
      )}
    </div>
  );
}
