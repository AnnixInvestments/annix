"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { StockManagementApiClient } from "../api/stockManagementApi";
import {
  PaintProRataSplitEditor,
  type ProRataJobCard,
  type ProRataSplit,
} from "../components/PaintProRataSplitEditor";
import {
  type RubberRollIssueDetails,
  RubberRollSubEditor,
} from "../components/RubberRollSubEditor";
import type { CpoChildJc, SelectedProductSpec } from "../hooks/useCpoContext";
import { specMatchesCoat } from "../hooks/useCpoContext";
import { useIssuableProducts } from "../hooks/useIssuanceQueries";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";
import type { IssuableProductDto } from "../types/products";

export interface CartRow {
  product: IssuableProductDto;
  quantity: number;
  batchNumber: string;
  tinBatchNumbers: string[];
  coatType: "primer" | "intermediate" | "final" | "rubber_lining" | null;
  paintSplits: ProRataSplit[];
  rubberRollDetails: RubberRollIssueDetails;
}

const EMPTY_RUBBER_ROLL: RubberRollIssueDetails = {
  weightKgIssued: 0,
  issuedWidthMm: null,
  issuedLengthM: null,
  issuedThicknessMm: null,
  expectsOffcutReturn: false,
};

function kitSizeForProduct(product: IssuableProductDto): number | null {
  const paint = product.paint;
  if (!paint) return null;
  const numParts = paint.numberOfParts;
  const ratioStr = paint.mixingRatio;
  const packA = paint.packSizeLitres;
  if (numParts == null || numParts <= 1 || !ratioStr || !packA) return null;
  const ratioParts = ratioStr.split(":").map(Number);
  const rawA = ratioParts[0];
  const rawB = ratioParts[1];
  const rawC = ratioParts[2];
  const rA = rawA == null || Number.isNaN(rawA) ? 1 : rawA;
  const rB = rawB == null || Number.isNaN(rawB) ? 0 : rawB;
  const rC = rawC == null || Number.isNaN(rawC) ? 0 : rawC;
  const totalRatio = rA + rB + rC;
  return packA * (totalRatio / rA);
}

function snapToKit(litres: number, kitSize: number): { down: number; up: number } {
  const kitsDown = Math.floor(litres / kitSize);
  const kitsUp = Math.ceil(litres / kitSize);
  return {
    down: Math.max(kitsDown, 1) * kitSize,
    up: Math.max(kitsUp, 1) * kitSize,
  };
}

export { EMPTY_RUBBER_ROLL, kitSizeForProduct, snapToKit };

export interface IssueStockItemsStepProps {
  cart: CartRow[];
  setCart: (cart: CartRow[]) => void;
  search: string;
  setSearch: (s: string) => void;
  pendingAllocQty: number | null;
  setPendingAllocQty: (q: number | null) => void;
  pendingCoatType: CartRow["coatType"];
  setPendingCoatType: (ct: CartRow["coatType"]) => void;
  selectedProductSpec: SelectedProductSpec;
  targetKind: "cpo" | "job_card" | null;
  cpoChildJcs: CpoChildJc[];
  selectedCpoJcIds: number[];
  selectedCoatsSummary: {
    selectedM2: number;
    paints: Array<{
      product: string;
      litres: number;
      role: string | null;
      minDftUm: number | null;
      maxDftUm: number | null;
      genericType: string | null;
    }>;
    selectedJcCount: number;
  };
  cpoIssuedTotals: Array<{
    productId: number;
    productName: string;
    rowType: string;
    totalIssued: number;
  }>;
  cpoCoatingSpecs: string | null;
  cpoJobCards: ProRataJobCard[];
  showPaintProRata: boolean;
  onNext: () => void;
}

export function IssueStockItemsStep(props: IssueStockItemsStepProps) {
  const {
    cart,
    setCart,
    search,
    setSearch,
    pendingAllocQty,
    setPendingAllocQty,
    pendingCoatType,
    setPendingCoatType,
    selectedProductSpec,
    targetKind,
    cpoChildJcs,
    selectedCpoJcIds,
    selectedCoatsSummary,
    cpoIssuedTotals,
    cpoCoatingSpecs,
    cpoJobCards,
    showPaintProRata,
    onNext,
  } = props;

  const config = useStockManagementConfig();
  const isPhotoEnabled = useStockManagementFeature("PHOTO_IDENTIFICATION");

  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [photoResult, setPhotoResult] = useState<{
    matches: Array<{ productId: number; sku: string; name: string; productType: string }>;
  } | null>(null);
  const [linkedPartsMap, setLinkedPartsMap] = useState<Record<number, IssuableProductDto[]>>({});
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);
  const [allocPaintQty, setAllocPaintQty] = useState<Record<string, number>>({});

  const { data: productsResult, isLoading } = useIssuableProducts({
    search: search || undefined,
    active: true,
    pageSize: 25,
  });
  const productItems = productsResult?.items;
  const products = productItems ? productItems : [];

  const addToCart = (product: IssuableProductDto) => {
    if (cart.some((c) => c.product.id === product.id)) return;
    const rawQty = pendingAllocQty != null ? pendingAllocQty : 1;
    const kit = kitSizeForProduct(product);
    const qty = kit != null ? snapToKit(rawQty, kit).up : rawQty;
    setCart([
      ...cart,
      {
        product,
        quantity: qty,
        batchNumber: "",
        tinBatchNumbers: [],
        coatType: (() => {
          if (product.productType === "rubber_roll") return "rubber_lining" as const;
          if (pendingCoatType != null) return pendingCoatType;
          const paintDetail = product.paint;
          const ct = paintDetail == null ? null : paintDetail.coatType;
          if (ct === "primer") return "primer" as const;
          if (ct === "finish" || ct === "intermediate") return "final" as const;
          return null;
        })(),
        paintSplits: [],
        rubberRollDetails: { ...EMPTY_RUBBER_ROLL },
      },
    ]);
    setPendingAllocQty(null);
    setPendingCoatType(null);
    const groupKey = product.paint?.componentGroupKey;
    if (product.productType === "paint" && groupKey) {
      fetch(`/api/stock-management/products/${product.id}/linked-parts`, {
        headers: config.authHeaders(),
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((parts: IssuableProductDto[]) => {
          setLinkedPartsMap((prev) => ({ ...prev, [product.id]: parts }));
        })
        .catch(() => {});
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((c) => c.product.id !== productId));
  };

  const updateCartRow = (productId: number, patch: Partial<CartRow>) => {
    setCart(cart.map((c) => (c.product.id === productId ? { ...c, ...patch } : c)));
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoCapturing(true);
    setPhotoResult(null);
    try {
      const client = new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      });
      const result = await client.identifyPhoto(file);
      setPhotoResult({ matches: result.matches });
    } catch (err) {
      console.error("Photo identification failed", err);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("Photo identification failed");
    } finally {
      setPhotoCapturing(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Items
        {selectedProductSpec != null ? (
          <span className="ml-2 text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {selectedProductSpec.kind === "paint"
              ? `${selectedProductSpec.product}${selectedProductSpec.role != null ? ` (${selectedProductSpec.role})` : ""}`
              : selectedProductSpec.specLabel}
          </span>
        ) : null}
      </h2>

      {targetKind === "cpo" &&
      selectedCoatsSummary.paints.length > 0 &&
      (selectedProductSpec == null || selectedProductSpec.kind === "paint") ? (
        <PaintAllocationPanel
          selectedCoatsSummary={selectedCoatsSummary}
          selectedProductSpec={selectedProductSpec}
          cart={cart}
          cpoIssuedTotals={cpoIssuedTotals}
          allocPaintQty={allocPaintQty}
          setAllocPaintQty={setAllocPaintQty}
          setPendingAllocQty={setPendingAllocQty}
          setPendingCoatType={setPendingCoatType}
          setSearch={setSearch}
        />
      ) : null}

      {targetKind === "cpo" &&
      cpoChildJcs.some((jc) => jc.hasInternalLining) &&
      (selectedProductSpec == null || selectedProductSpec.kind === "rubber") ? (
        <RubberAllocationPanel
          cpoChildJcs={cpoChildJcs}
          selectedCpoJcIds={selectedCpoJcIds}
          cpoCoatingSpecs={cpoCoatingSpecs}
          cart={cart}
          setSearch={setSearch}
        />
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={config.label("issueStock.itemPicker.searchPlaceholder")}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        {isPhotoEnabled && (
          <label className="px-4 py-2 bg-amber-500 text-white rounded text-sm font-medium cursor-pointer">
            📷 {photoCapturing ? "..." : config.label("issueStock.itemPicker.cameraButton")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </label>
        )}
      </div>

      {photoResult && photoResult.matches.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-900 mb-2">Photo matches:</div>
          <div className="space-y-1">
            {photoResult.matches.map((m) => (
              <button
                key={m.productId}
                type="button"
                onClick={() => {
                  const product = products.find((p) => p.id === m.productId);
                  if (product) addToCart(product);
                  setPhotoResult(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-amber-100 text-xs"
              >
                <span className="font-mono">{m.sku}</span> · {m.name} ({m.productType})
              </button>
            ))}
          </div>
        </div>
      )}

      {search.trim() === "" && !photoResult ? (
        <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
          Type to search for consumables, paint, or rubber rolls
        </div>
      ) : null}

      {search.trim() !== "" || photoResult ? (
        <div className="rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
          {isLoading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
          {!isLoading && products.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No products found</div>
          )}
          {products.map((p) => {
            const inCart = cart.some((c) => c.product.id === p.id);
            const rawUom = p.unitOfMeasure;
            const uom = rawUom == null ? "each" : rawUom;
            const paintDetail = p.paint;
            const packSize = paintDetail == null ? null : paintDetail.packSizeLitres;
            const packLabel = packSize != null ? ` (${packSize}L per tin)` : "";
            const compRole = paintDetail == null ? null : paintDetail.componentRole;
            const roleLabel = compRole != null ? ` · ${compRole}` : "";
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                disabled={inCart}
                className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.sku} · {p.productType}
                      {roleLabel} · Qty: {p.quantity} {uom}
                      {packLabel}
                    </div>
                  </div>
                  <span className="text-xs text-teal-700">{inCart ? "In cart" : "Add +"}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {cart.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Cart ({cart.length})</h3>
          <div className="rounded-lg border border-gray-200 divide-y">
            {cart.map((row) => (
              <CartRowPanel
                key={row.product.id}
                row={row}
                removeFromCart={removeFromCart}
                updateCartRow={updateCartRow}
                linkedPartsMap={linkedPartsMap}
                showPaintProRata={showPaintProRata}
                cpoJobCards={cpoJobCards}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const dismissed = localStorage.getItem("sm_skip_confirm_warning");
          if (dismissed === "true") {
            onNext();
          } else {
            setShowConfirmWarning(true);
          }
        }}
        disabled={cart.length === 0}
        className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
      >
        Next → Confirm
      </button>

      {showConfirmWarning
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="fixed inset-0 bg-black/10 backdrop-blur-md"
                onClick={() => setShowConfirmWarning(false)}
                aria-hidden="true"
              />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add all items before proceeding
                </h3>
                <p className="text-sm text-gray-600">
                  Make sure you have added all products for this dispatch before confirming. Once
                  submitted, you cannot add more items to this issuance session.
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-500">
                  <input
                    type="checkbox"
                    checked={dontShowAgainChecked}
                    onChange={(e) => setDontShowAgainChecked(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Do not show this again
                </label>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowConfirmWarning(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dontShowAgainChecked) {
                        localStorage.setItem("sm_skip_confirm_warning", "true");
                      }
                      setShowConfirmWarning(false);
                      onNext();
                    }}
                    className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium hover:bg-teal-700"
                  >
                    Proceed to confirm
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function PaintAllocationPanel(props: {
  selectedCoatsSummary: {
    paints: Array<{ product: string; litres: number; role: string | null }>;
  };
  selectedProductSpec: SelectedProductSpec;
  cart: CartRow[];
  cpoIssuedTotals: Array<{
    productId: number;
    productName: string;
    rowType: string;
    totalIssued: number;
  }>;
  allocPaintQty: Record<string, number>;
  setAllocPaintQty: (qty: Record<string, number>) => void;
  setPendingAllocQty: (q: number | null) => void;
  setPendingCoatType: (ct: CartRow["coatType"]) => void;
  setSearch: (s: string) => void;
}) {
  const {
    selectedCoatsSummary,
    selectedProductSpec,
    cart,
    cpoIssuedTotals,
    allocPaintQty,
    setAllocPaintQty,
    setPendingAllocQty,
    setPendingCoatType,
    setSearch,
  } = props;

  return (
    <div className="rounded border border-blue-200 bg-blue-50 p-3 space-y-2">
      <h3 className="text-sm font-semibold text-blue-900">
        CPO Paint Allocation
        {selectedProductSpec != null && selectedProductSpec.kind === "paint"
          ? ` — ${selectedProductSpec.product}`
          : ""}
      </h3>
      <p className="text-xs text-blue-700">
        Paint required for the selected JCs. Click a product to search stock.
      </p>
      <div className="space-y-1">
        {selectedCoatsSummary.paints
          .filter((p) => specMatchesCoat(selectedProductSpec, p.product, p.role, false))
          .map((p) => {
            const roleLabel = p.role == null ? "" : ` (${p.role})`;
            const alreadyInCart = cart.some((c) => {
              const productName = c.product.name.toUpperCase();
              const paintName = p.product.toUpperCase();
              return (
                productName.includes(paintName.slice(0, 15)) ||
                paintName.includes(productName.slice(0, 15))
              );
            });
            const priorIssued = cpoIssuedTotals.reduce((sum, t) => {
              const issuedName = t.productName.toUpperCase();
              const paintName = p.product.toUpperCase();
              const matches =
                issuedName.includes(paintName.slice(0, 15)) ||
                paintName.includes(issuedName.slice(0, 15));
              return matches ? sum + t.totalIssued : sum;
            }, 0);
            const remaining = Math.max(p.litres - priorIssued, 0);
            const fullyIssued = priorIssued >= p.litres && priorIssued > 0;
            const rawAllocQty = allocPaintQty[p.product];
            const issueQty = rawAllocQty == null ? Math.ceil(remaining) : rawAllocQty;
            return (
              <div
                key={p.product}
                className={`flex items-center gap-2 rounded px-3 py-2 border ${
                  fullyIssued ? "bg-green-50 border-green-200" : "bg-white border-blue-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-900 truncate">
                    {p.product}
                    {roleLabel}
                  </div>
                  <div className="text-xs text-blue-700">
                    {p.litres.toFixed(1)} L required
                    {priorIssued > 0 ? (
                      <span className="ml-1 text-green-700 font-medium">
                        ({Math.round(priorIssued * 100) / 100}L already issued
                        {fullyIssued ? " - COMPLETE" : `, ${remaining.toFixed(1)}L remaining`})
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <label className="text-[10px] text-gray-500 uppercase">Issue L</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={issueQty > 0 ? String(issueQty) : ""}
                    placeholder="0"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const val = raw === "" ? 0 : parseInt(raw, 10);
                      setAllocPaintQty({ ...allocPaintQty, [p.product]: val });
                    }}
                    className="w-16 border border-gray-300 rounded px-1.5 py-1 text-sm text-center"
                    disabled={alreadyInCart || fullyIssued}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAllocQty(issueQty);
                    const role = p.role;
                    const coatType: CartRow["coatType"] =
                      role === "primer"
                        ? "primer"
                        : role === "intermediate"
                          ? "intermediate"
                          : role === "final"
                            ? "final"
                            : null;
                    setPendingCoatType(coatType);
                    setSearch(p.product.split(" ").slice(0, 3).join(" "));
                  }}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded ${
                    fullyIssued
                      ? "bg-green-100 text-green-700"
                      : alreadyInCart
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  disabled={alreadyInCart || fullyIssued}
                >
                  {fullyIssued ? "Issued" : alreadyInCart ? "In cart" : "Find & add"}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function RubberAllocationPanel(props: {
  cpoChildJcs: CpoChildJc[];
  selectedCpoJcIds: number[];
  cpoCoatingSpecs: string | null;
  cart: CartRow[];
  setSearch: (s: string) => void;
}) {
  const { cpoChildJcs, selectedCpoJcIds, cpoCoatingSpecs, cart, setSearch } = props;

  const rubberLines: string[] = [];
  if (cpoCoatingSpecs != null) {
    const lines = cpoCoatingSpecs.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      const upper = trimmed.toUpperCase();
      if (
        upper.includes("R/L") ||
        upper.includes("RUBBER") ||
        upper.includes("FOLD") ||
        upper.includes("LOOSE RUBBER")
      ) {
        rubberLines.push(trimmed);
      }
    }
  }
  const uniqueSpecs = [...new Set(rubberLines)];

  return (
    <div className="rounded border border-purple-200 bg-purple-50 p-3 space-y-2">
      <h3 className="text-sm font-semibold text-purple-900">CPO Rubber Allocation</h3>
      {uniqueSpecs.length > 0 ? (
        <div className="rounded bg-purple-100 px-3 py-2 text-xs text-purple-900 space-y-0.5">
          <div className="font-semibold text-[10px] uppercase tracking-wide text-purple-700">
            Rubber Specification
          </div>
          {uniqueSpecs.map((spec) => (
            <div key={spec}>{spec}</div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-purple-700">
          Job cards requiring internal rubber lining. Search for rubber rolls below.
        </p>
      )}
      <div className="space-y-1">
        {cpoChildJcs
          .filter((jc) => {
            const rubberFlag = jc.hasInternalLining;
            return (
              rubberFlag === true ||
              jc.lineItems.some((li) => {
                const desc = li.itemDescription == null ? "" : li.itemDescription;
                const upper = desc.toUpperCase();
                return (
                  upper.includes("R/L") ||
                  upper.includes("R/FLG") ||
                  upper.includes("RUBBER") ||
                  upper.includes("+ R")
                );
              })
            );
          })
          .map((jc) => {
            const jcLabel = jc.jcNumber == null ? jc.jobNumber : jc.jcNumber;
            const isSelected = selectedCpoJcIds.includes(jc.id);
            if (!isSelected) return null;
            if (jc.lineItems.length === 0) return null;
            const jcHasRubber = jc.hasInternalLining === true;
            const rubberItems = jcHasRubber
              ? jc.lineItems
              : jc.lineItems.filter((li) => {
                  const desc = li.itemDescription == null ? "" : li.itemDescription;
                  const upper = desc.toUpperCase();
                  return (
                    upper.includes("R/L") ||
                    upper.includes("R/FLG") ||
                    upper.includes("RUBBER") ||
                    upper.includes("+ R")
                  );
                });
            const totalQty = rubberItems.reduce((sum, li) => {
              const qty = li.quantity == null ? 1 : li.quantity;
              return sum + qty;
            }, 0);
            const alreadyInCart = cart.some((c) => c.product.productType === "rubber_roll");
            return (
              <div
                key={jc.id}
                className="flex items-center gap-2 rounded bg-white px-3 py-2 border border-purple-100 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-purple-900">
                    {jcLabel} — {rubberItems.length} item
                    {rubberItems.length !== 1 ? "s" : ""} ({totalQty} pcs)
                  </div>
                  <div className="text-purple-700">{jc.intM2.toFixed(1)} m² internal</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSearch("rubber")}
                  disabled={alreadyInCart}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded ${
                    alreadyInCart
                      ? "bg-green-100 text-green-700"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {alreadyInCart ? "In cart" : "Find rubber"}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function CartRowPanel(props: {
  row: CartRow;
  removeFromCart: (productId: number) => void;
  updateCartRow: (productId: number, patch: Partial<CartRow>) => void;
  linkedPartsMap: Record<number, IssuableProductDto[]>;
  showPaintProRata: boolean;
  cpoJobCards: ProRataJobCard[];
}) {
  const { row, removeFromCart, updateCartRow, linkedPartsMap, showPaintProRata, cpoJobCards } =
    props;

  const paintDetail = row.product.paint;
  const numParts = paintDetail == null ? null : paintDetail.numberOfParts;
  const ratioStr = paintDetail == null ? null : paintDetail.mixingRatio;
  const packSizeA = paintDetail == null ? null : paintDetail.packSizeLitres;
  const kit = kitSizeForProduct(row.product);
  const isMultiPart = numParts != null && numParts > 1 && ratioStr != null && kit != null;
  const productId = row.product.id;
  const rawLinked = linkedPartsMap[productId];
  const linkedParts = rawLinked || [];

  const ratioParts = isMultiPart ? ratioStr.split(":").map(Number) : [];
  const rawRatioA = ratioParts[0];
  const rawRatioB = ratioParts[1];
  const ratioA = rawRatioA == null || Number.isNaN(rawRatioA) ? 1 : rawRatioA;
  const ratioB = rawRatioB == null || Number.isNaN(rawRatioB) ? 0 : rawRatioB;

  const numKits = isMultiPart ? Math.round(row.quantity / kit) : 0;
  const partAPerKit = packSizeA || 0;
  const partBPerKit = isMultiPart ? partAPerKit * (ratioB / ratioA) : 0;
  const tinsA = numKits;
  const tinsB = numKits;
  const totalPartA = tinsA * partAPerKit;
  const totalPartB = tinsB * partBPerKit;
  const grandTotal = totalPartA + totalPartB;

  const partBProduct = linkedParts.find((lp) => {
    const lpPaint = lp.paint;
    const role = lpPaint == null ? null : lpPaint.componentRole;
    return role === "hardener" || role === "Hardener" || role === "Part B";
  });
  const partBName = partBProduct == null ? "Part B (Hardener)" : partBProduct.name;
  const partBPaint = partBProduct == null ? null : partBProduct.paint;
  const partBPackSize = partBPaint == null ? null : partBPaint.packSizeLitres;
  const partBStock = partBProduct == null ? null : partBProduct.quantity;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{row.product.name}</div>
          <div className="text-xs text-gray-500 truncate">
            {row.product.sku} · {row.product.productType}
          </div>
        </div>
        <button
          type="button"
          onClick={() => removeFromCart(row.product.id)}
          className="shrink-0 text-red-600 text-xs hover:underline px-2 py-1"
        >
          Remove
        </button>
      </div>
      {(() => {
        if (isMultiPart) {
          const rowQty = row.quantity;
          const snapped = snapToKit(rowQty, kit);
          const snapDown = snapped.down;
          const snapUp = snapped.up;
          const isExactKit = rowQty === snapDown || rowQty === snapUp;
          return (
            <div className="space-y-2">
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs space-y-2">
                <div className="font-semibold text-blue-900">
                  Kit size: {kit}L (mix {ratioStr}) — {partAPerKit}L Part A + {partBPerKit}L Part B
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newKits = Math.max(numKits - 1, 1);
                      updateCartRow(row.product.id, { quantity: newKits * kit });
                    }}
                    className="w-7 h-7 rounded bg-blue-200 text-blue-900 font-bold hover:bg-blue-300 text-sm"
                  >
                    -
                  </button>
                  <span className="font-mono text-blue-900 font-semibold min-w-[80px] text-center">
                    {numKits} kit{numKits !== 1 ? "s" : ""} = {grandTotal}L
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newKits = numKits + 1;
                      updateCartRow(row.product.id, { quantity: newKits * kit });
                    }}
                    className="w-7 h-7 rounded bg-blue-200 text-blue-900 font-bold hover:bg-blue-300 text-sm"
                  >
                    +
                  </button>
                  {!isExactKit ? (
                    <span className="text-amber-700 text-[10px]">
                      (was {rowQty}L — snapped to nearest kit)
                    </span>
                  ) : null}
                </div>
                <div className="border-t border-blue-200 pt-1 space-y-0.5">
                  <div className="flex justify-between text-blue-800">
                    <span>
                      Part A: {row.product.name} ({partAPerKit}L/tin)
                    </span>
                    <span className="font-mono">
                      {tinsA} tin{tinsA !== 1 ? "s" : ""} = {totalPartA}L
                    </span>
                  </div>
                  <div className="flex justify-between text-blue-800">
                    <span>
                      Part B: {partBName}
                      {partBPackSize != null ? ` (${partBPackSize}L/tin)` : ""}
                      {partBStock != null ? (
                        <span className="text-gray-500 ml-1">[{partBStock} in stock]</span>
                      ) : null}
                    </span>
                    <span className="font-mono">
                      {tinsB} tin{tinsB !== 1 ? "s" : ""} = {totalPartB}L
                    </span>
                  </div>
                  <div className="flex justify-between text-blue-900 font-semibold border-t border-blue-200 pt-1">
                    <span>Total mixed</span>
                    <span className="font-mono">{grandTotal}L</span>
                  </div>
                </div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Batch numbers per tin</span>
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      onChange={(e) => {
                        if (!e.target.checked) return;
                        const existing = row.tinBatchNumbers;
                        const firstA = existing[0] == null ? "" : existing[0];
                        const firstB =
                          tinsB > 0 ? (existing[tinsA] == null ? "" : existing[tinsA]) : "";
                        const filled = Array.from({ length: tinsA + tinsB }, (_, idx) =>
                          idx < tinsA ? firstA : firstB,
                        );
                        updateCartRow(row.product.id, { tinBatchNumbers: filled });
                      }}
                    />
                    Same batch for all
                  </label>
                </div>
                <div className="text-[10px] text-gray-500 mb-1">
                  Part A tins ({partAPerKit}L each)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {Array.from({ length: tinsA }).map((_, i) => {
                    const rawBatch = row.tinBatchNumbers[i];
                    const batchVal = rawBatch == null ? "" : rawBatch;
                    return (
                      <input
                        key={`a-${i}`}
                        type="text"
                        value={batchVal}
                        onChange={(e) => {
                          const updated = [...row.tinBatchNumbers];
                          updated[i] = e.target.value;
                          updateCartRow(row.product.id, { tinBatchNumbers: updated });
                        }}
                        placeholder={`A${i + 1} batch`}
                        className="border border-gray-300 rounded px-1.5 py-1 text-xs"
                      />
                    );
                  })}
                </div>
                {tinsB > 0 ? (
                  <>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Part B tins ({partBPerKit}L each)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {Array.from({ length: tinsB }).map((_, i) => {
                        const idx = tinsA + i;
                        const rawBatchB = row.tinBatchNumbers[idx];
                        const batchVal = rawBatchB == null ? "" : rawBatchB;
                        return (
                          <input
                            key={`b-${i}`}
                            type="text"
                            value={batchVal}
                            onChange={(e) => {
                              const updated = [...row.tinBatchNumbers];
                              updated[idx] = e.target.value;
                              updateCartRow(row.product.id, { tinBatchNumbers: updated });
                            }}
                            placeholder={`B${i + 1} batch`}
                            className="border border-gray-300 rounded px-1.5 py-1 text-xs"
                          />
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        }

        if (packSizeA != null && row.product.productType === "paint") {
          const tinsNeeded = Math.ceil(row.quantity / packSizeA);
          return (
            <div className="space-y-2">
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                {packSizeA}L per tin x {tinsNeeded} tins = {(tinsNeeded * packSizeA).toFixed(1)}L
                (single pack)
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Qty (L)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) =>
                      updateCartRow(row.product.id, { quantity: Number(e.target.value) })
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Batch #
                  </label>
                  <input
                    type="text"
                    value={row.batchNumber}
                    onChange={(e) => updateCartRow(row.product.id, { batchNumber: e.target.value })}
                    placeholder="optional"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                Qty
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={row.quantity}
                onChange={(e) =>
                  updateCartRow(row.product.id, { quantity: Number(e.target.value) })
                }
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                Batch #
              </label>
              <input
                type="text"
                value={row.batchNumber}
                onChange={(e) => updateCartRow(row.product.id, { batchNumber: e.target.value })}
                placeholder="optional"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
          </div>
        );
      })()}
      {row.product.productType === "paint" && showPaintProRata ? (
        <PaintProRataSplitEditor
          totalLitres={row.quantity}
          jobCards={cpoJobCards}
          splits={row.paintSplits}
          onChange={(splits) => updateCartRow(row.product.id, { paintSplits: splits })}
        />
      ) : null}
      {row.product.productType === "rubber_roll" ? (
        <RubberRollSubEditor
          value={row.rubberRollDetails}
          productName={row.product.name}
          onChange={(details) => updateCartRow(row.product.id, { rubberRollDetails: details })}
        />
      ) : null}
    </div>
  );
}
