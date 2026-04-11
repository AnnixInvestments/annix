"use client";

import { useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
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
}

export function IssueStockPage() {
  const config = useStockManagementConfig();
  const isBasicEnabled = useStockManagementFeature("BASIC_ISSUING");
  const isPhotoEnabled = useStockManagementFeature("PHOTO_IDENTIFICATION");
  const [currentStep, setCurrentStep] = useState<StepKey>("issuer");
  const [issuerStaffId, setIssuerStaffId] = useState<number | "">("");
  const [recipientStaffId, setRecipientStaffId] = useState<number | "">("");
  const [jobCardId, setJobCardId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartRow[]>([]);
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
  const products = productsResult?.items ?? [];

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
    setCart([...cart, { product, quantity: 1, batchNumber: "" }]);
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
    const rows: IssuanceRowInputDto[] = cart.map((row) => {
      if (row.product.productType === "paint") {
        return {
          rowType: "paint",
          productId: row.product.id,
          jobCardId: jobCardId === "" ? null : Number(jobCardId),
          litres: row.quantity,
          batchNumber: row.batchNumber || null,
        };
      }
      if (row.product.productType === "rubber_roll") {
        return {
          rowType: "rubber_roll",
          productId: row.product.id,
          jobCardId: jobCardId === "" ? null : Number(jobCardId),
          weightKgIssued: row.quantity,
        };
      }
      if (row.product.productType === "solution") {
        return {
          rowType: "solution",
          productId: row.product.id,
          jobCardId: jobCardId === "" ? null : Number(jobCardId),
          volumeL: row.quantity,
          batchNumber: row.batchNumber || null,
        };
      }
      return {
        rowType: "consumable",
        productId: row.product.id,
        jobCardId: jobCardId === "" ? null : Number(jobCardId),
        quantity: row.quantity,
        batchNumber: row.batchNumber || null,
      };
    });
    try {
      await createMutation.createSession({
        issuerStaffId: issuerStaffId === "" ? null : Number(issuerStaffId),
        recipientStaffId: recipientStaffId === "" ? null : Number(recipientStaffId),
        jobCardIds: jobCardId === "" ? null : [Number(jobCardId)],
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
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{config.label("issueStock.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{config.label("issueStock.subtitle")}</p>
      </header>

      <nav className="flex items-center gap-3 flex-wrap">
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${tone}`}
            >
              {index + 1}. {config.label(`issueStock.step.${step.key}`, step.label)}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {currentStep === "issuer" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Issuer (storeman issuing the stock)</h2>
            <input
              type="number"
              value={issuerStaffId}
              onChange={(e) => setIssuerStaffId(e.target.value ? Number(e.target.value) : "")}
              placeholder="Staff ID"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
            <input
              type="number"
              value={recipientStaffId}
              onChange={(e) => setRecipientStaffId(e.target.value ? Number(e.target.value) : "")}
              placeholder="Staff ID"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
            <input
              type="number"
              value={jobCardId}
              onChange={(e) => setJobCardId(e.target.value ? Number(e.target.value) : "")}
              placeholder="Job Card ID (optional)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("items")}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium"
            >
              Next →
            </button>
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
                    <div key={row.product.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{row.product.name}</div>
                        <div className="text-xs text-gray-500">
                          {row.product.sku} · {row.product.productType}
                        </div>
                      </div>
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          updateCartRow(row.product.id, { quantity: Number(e.target.value) })
                        }
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        value={row.batchNumber}
                        onChange={(e) =>
                          updateCartRow(row.product.id, { batchNumber: e.target.value })
                        }
                        placeholder="Batch #"
                        className="w-28 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeFromCart(row.product.id)}
                        className="text-red-600 text-xs hover:underline"
                      >
                        Remove
                      </button>
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
              {jobCardId && <div>Job Card: #{jobCardId}</div>}
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
