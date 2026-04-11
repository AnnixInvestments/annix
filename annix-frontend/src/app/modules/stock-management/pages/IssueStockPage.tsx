"use client";

import { useEffect, useMemo, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { JobCardOrCpoPicker, type TargetSelection } from "../components/JobCardOrCpoPicker";
import {
  PaintProRataSplitEditor,
  type ProRataJobCard,
  type ProRataSplit,
} from "../components/PaintProRataSplitEditor";
import {
  type RubberRollIssueDetails,
  RubberRollSubEditor,
} from "../components/RubberRollSubEditor";
import { StaffPicker } from "../components/StaffPicker";
import { useCreateIssuanceSession, useIssuableProducts } from "../hooks/useIssuanceQueries";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";
import type { IssuanceRowInputDto } from "../types/issuance";
import type { IssuableProductDto } from "../types/products";

type StepKey = "issuer" | "recipient" | "target" | "items" | "confirm";

const STEPS: ReadonlyArray<{ key: StepKey; label: string }> = [
  { key: "issuer", label: "Issuer" },
  { key: "recipient", label: "Recipient" },
  { key: "target", label: "Job Card or CPO" },
  { key: "items", label: "Items" },
  { key: "confirm", label: "Confirm" },
];

interface CartRow {
  product: IssuableProductDto;
  quantity: number;
  batchNumber: string;
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

export function IssueStockPage() {
  const config = useStockManagementConfig();
  const isBasicEnabled = useStockManagementFeature("BASIC_ISSUING");
  const isPhotoEnabled = useStockManagementFeature("PHOTO_IDENTIFICATION");
  const loggedInStaffId = config.currentUser.staffId;
  const initialIssuerStaffId: number | "" = loggedInStaffId == null ? "" : loggedInStaffId;
  const [currentStep, setCurrentStep] = useState<StepKey>("issuer");
  const [issuerStaffId, setIssuerStaffId] = useState<number | "">(initialIssuerStaffId);
  const [recipientStaffId, setRecipientStaffId] = useState<number | "">("");
  const [target, setTarget] = useState<TargetSelection | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [cpoJobCards, setCpoJobCards] = useState<ProRataJobCard[]>([]);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [photoResult, setPhotoResult] = useState<{
    matches: Array<{ productId: number; sku: string; name: string; productType: string }>;
  } | null>(null);

  const { data: productsResult, isLoading } = useIssuableProducts({
    search: search || undefined,
    active: true,
    pageSize: 25,
  });
  const createMutation = useCreateIssuanceSession();
  const productItems = productsResult?.items;
  const products = productItems ? productItems : [];

  const targetKind = target == null ? null : target.kind;
  const targetId = target == null ? null : target.id;
  const authHeaders = config.authHeaders;

  useEffect(() => {
    if (targetKind !== "cpo" || targetId == null) {
      setCpoJobCards([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/stock-control/issuance/cpo-batch/context/${targetId}`, {
      headers: authHeaders(),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(
        (data: {
          jobCards?: Array<{
            id: number;
            jobNumber: string;
            jcNumber: string | null;
            extM2: number;
            intM2: number;
          }>;
        }) => {
          if (cancelled) {
            return;
          }
          const rawJcs = data.jobCards;
          const jcs = rawJcs == null ? [] : rawJcs;
          setCpoJobCards(
            jcs.map((jc) => ({
              id: jc.id,
              jcNumber: jc.jcNumber,
              jobNumber: jc.jobNumber,
              totalAreaM2: jc.extM2 + jc.intM2,
            })),
          );
        },
      )
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Failed to load CPO ${targetId} job cards: ${message}`);
        setCpoJobCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [targetKind, targetId, authHeaders]);

  const showPaintProRata = useMemo(() => {
    return targetKind === "cpo" && cpoJobCards.length > 1;
  }, [targetKind, cpoJobCards]);

  if (!isBasicEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">{config.label("issueStock.title")}</h1>
        <p className="text-sm text-gray-600">{config.label("feature.upgradePrompt.body")}</p>
      </div>
    );
  }

  const addToCart = (product: IssuableProductDto) => {
    if (cart.some((c) => c.product.id === product.id)) return;
    setCart([
      ...cart,
      {
        product,
        quantity: 1,
        batchNumber: "",
        paintSplits: [],
        rubberRollDetails: { ...EMPTY_RUBBER_ROLL },
      },
    ]);
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
      alert("Photo identification failed");
    } finally {
      setPhotoCapturing(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    const rowJobCardId = target != null && target.kind === "job_card" ? target.id : null;
    const rows: IssuanceRowInputDto[] = cart.map((row) => {
      if (row.product.productType === "paint") {
        const splits = row.paintSplits;
        const hasSplits = splits.length > 0;
        const proRataMap: Record<string, number> = {};
        if (hasSplits) {
          for (const split of splits) {
            proRataMap[String(split.jobCardId)] = split.litres;
          }
        }
        return {
          rowType: "paint",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          litres: row.quantity,
          batchNumber: row.batchNumber || null,
          cpoProRataSplit: hasSplits ? proRataMap : null,
        };
      }
      if (row.product.productType === "rubber_roll") {
        const details = row.rubberRollDetails;
        const weight = details.weightKgIssued > 0 ? details.weightKgIssued : row.quantity;
        return {
          rowType: "rubber_roll",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          weightKgIssued: weight,
          issuedWidthMm: details.issuedWidthMm,
          issuedLengthM: details.issuedLengthM,
          issuedThicknessMm: details.issuedThicknessMm,
        };
      }
      if (row.product.productType === "solution") {
        return {
          rowType: "solution",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          volumeL: row.quantity,
          batchNumber: row.batchNumber || null,
        };
      }
      return {
        rowType: "consumable",
        productId: row.product.id,
        jobCardId: rowJobCardId,
        quantity: row.quantity,
        batchNumber: row.batchNumber || null,
      };
    });
    const sessionCpoId = target != null && target.kind === "cpo" ? target.id : null;
    const sessionJobCardIds = target != null && target.kind === "job_card" ? [target.id] : null;
    try {
      await createMutation.createSession({
        issuerStaffId: issuerStaffId === "" ? null : Number(issuerStaffId),
        recipientStaffId: recipientStaffId === "" ? null : Number(recipientStaffId),
        cpoId: sessionCpoId,
        jobCardIds: sessionJobCardIds,
        rows,
      });
      alert("Session created successfully");
      setCart([]);
      setCurrentStep("issuer");
    } catch (err) {
      console.error("Submit failed", err);
      alert(err instanceof Error ? err.message : "Submit failed");
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {config.label("issueStock.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{config.label("issueStock.subtitle")}</p>
      </header>

      <nav className="flex items-center gap-2 flex-wrap">
        {STEPS.map((step, index) => {
          const isActive = step.key === currentStep;
          const isComplete = index < stepIndex;
          const tone = isActive
            ? "bg-teal-600 text-white"
            : isComplete
              ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-500";
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setCurrentStep(step.key)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition ${tone}`}
            >
              {index + 1}. {config.label(`issueStock.step.${step.key}`, step.label)}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        {currentStep === "issuer" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Issuer (storeman issuing the stock)</h2>
            <StaffPicker
              value={issuerStaffId}
              onChange={setIssuerStaffId}
              placeholder="Search staff issuing the stock"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("recipient")}
              disabled={!issuerStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === "recipient" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Recipient (staff receiving the stock)</h2>
            <StaffPicker
              value={recipientStaffId}
              onChange={setRecipientStaffId}
              placeholder="Search staff receiving the stock"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("target")}
              disabled={!recipientStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === "target" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Job Card or CPO</h2>
            <p className="text-xs text-gray-500">
              Optional. Pick a job card or a CPO to link this issuance to, or skip to continue
              without one.
            </p>
            <JobCardOrCpoPicker value={target} onChange={setTarget} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep("items")}
                className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
              >
                Next →
              </button>
              {target != null ? (
                <button
                  type="button"
                  onClick={() => {
                    setTarget(null);
                    setCurrentStep("items");
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                >
                  Skip (clear selection)
                </button>
              ) : null}
            </div>
          </div>
        )}

        {currentStep === "items" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Items</h2>
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

            <div className="rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
              {isLoading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
              {!isLoading && products.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No products found</div>
              )}
              {products.map((p) => {
                const inCart = cart.some((c) => c.product.id === p.id);
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
                          {p.sku} · {p.productType} · Qty: {p.quantity}
                        </div>
                      </div>
                      <span className="text-xs text-teal-700">{inCart ? "In cart" : "Add +"}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {cart.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Cart ({cart.length})</h3>
                <div className="rounded-lg border border-gray-200 divide-y">
                  {cart.map((row) => (
                    <div key={row.product.id} className="p-3 space-y-2">
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
                            onChange={(e) =>
                              updateCartRow(row.product.id, { batchNumber: e.target.value })
                            }
                            placeholder="optional"
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      {row.product.productType === "paint" && showPaintProRata ? (
                        <PaintProRataSplitEditor
                          totalLitres={row.quantity}
                          jobCards={cpoJobCards}
                          splits={row.paintSplits}
                          onChange={(splits) =>
                            updateCartRow(row.product.id, { paintSplits: splits })
                          }
                        />
                      ) : null}
                      {row.product.productType === "rubber_roll" ? (
                        <RubberRollSubEditor
                          value={row.rubberRollDetails}
                          productName={row.product.name}
                          onChange={(details) =>
                            updateCartRow(row.product.id, { rubberRollDetails: details })
                          }
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setCurrentStep("confirm")}
              disabled={cart.length === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next → Confirm
            </button>
          </div>
        )}

        {currentStep === "confirm" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm Issuance</h2>
            <div className="text-sm space-y-1">
              <div>Issuer: Staff #{issuerStaffId}</div>
              <div>Recipient: Staff #{recipientStaffId}</div>
              {target != null ? (
                <div>
                  {target.kind === "cpo" ? "CPO" : "Job Card"}: {target.label}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-gray-200 divide-y">
              {cart.map((row) => (
                <div key={row.product.id} className="p-3 text-sm flex justify-between">
                  <span>{row.product.name}</span>
                  <span className="font-mono">
                    {row.quantity} {row.product.unitOfMeasure}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep("items")}
                className="px-4 py-2 border border-gray-300 rounded text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Create Issuance"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueStockPage;
