"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CompoundCalculationResultDto,
  type RubberCompoundStockDto,
} from "@/app/lib/api/auRubberApi";
import type { RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../../components/Breadcrumb";

export default function NewProductionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [stocks, setStocks] = useState<RubberCompoundStockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [productId, setProductId] = useState<number | null>(null);
  const [compoundStockId, setCompoundStockId] = useState<number | null>(null);
  const [thicknessMm, setThicknessMm] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const [calculation, setCalculation] = useState<CompoundCalculationResultDto | null>(null);
  const [selectedStock, setSelectedStock] = useState<RubberCompoundStockDto | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, stocksData] = await Promise.all([
          auRubberApiClient.products(),
          auRubberApiClient.compoundStocks(),
        ]);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setStocks(Array.isArray(stocksData) ? stocksData : []);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to load data", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const stock = stocks.find((s) => s.id === compoundStockId);
    setSelectedStock(stock || null);
  }, [compoundStockId, stocks]);

  useEffect(() => {
    const calculateCompound = async () => {
      if (!productId || !thicknessMm || !widthMm || !lengthM || !quantity) {
        setCalculation(null);
        return;
      }

      try {
        setIsCalculating(true);
        const result = await auRubberApiClient.calculateCompoundRequired({
          productId,
          thicknessMm: Number(thicknessMm),
          widthMm: Number(widthMm),
          lengthM: Number(lengthM),
          quantity: Number(quantity),
        });
        setCalculation(result);
      } catch (err) {
        setCalculation(null);
      } finally {
        setIsCalculating(false);
      }
    };

    const debounce = setTimeout(calculateCompound, 300);
    return () => clearTimeout(debounce);
  }, [productId, thicknessMm, widthMm, lengthM, quantity]);

  const handleProductChange = (id: number | null) => {
    setProductId(id);
    if (id) {
      const product = products.find((p) => p.id === id);
      if (product) {
        const matchingStock = stocks.find((s) => s.compoundName === product.compoundName);
        if (matchingStock) {
          setCompoundStockId(matchingStock.id);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!productId || !compoundStockId || !thicknessMm || !widthMm || !lengthM || !quantity) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    if (calculation && selectedStock && calculation.compoundRequiredKg > selectedStock.quantityKg) {
      const confirm = window.confirm(
        `Warning: Required compound (${calculation.compoundRequiredKg.toFixed(2)} kg) exceeds available stock (${selectedStock.quantityKg.toFixed(2)} kg). Continue anyway?`,
      );
      if (!confirm) return;
    }

    try {
      setIsSubmitting(true);
      await auRubberApiClient.createProduction({
        productId,
        compoundStockId,
        thicknessMm: Number(thicknessMm),
        widthMm: Number(widthMm),
        lengthM: Number(lengthM),
        quantity: Number(quantity),
        notes: notes || undefined,
      });
      showToast("Production created", "success");
      router.push("/au-rubber/portal/productions");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create production", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insufficientStock =
    calculation && selectedStock && calculation.compoundRequiredKg > selectedStock.quantityKg;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Production", href: "/au-rubber/portal/productions" },
          { label: "New Production" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Production</h1>
        <p className="mt-1 text-sm text-gray-600">Create a new rubber sheet production run</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product *</label>
              <select
                value={productId ?? ""}
                onChange={(e) =>
                  handleProductChange(e.target.value ? Number(e.target.value) : null)
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Thickness (mm) *</label>
                <input
                  type="number"
                  value={thicknessMm}
                  onChange={(e) => setThicknessMm(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Width (mm) *</label>
                <input
                  type="number"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  step="1"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Length (m) *</label>
                <input
                  type="number"
                  value={lengthM}
                  onChange={(e) => setLengthM(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  step="1"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Compound Stock *</label>
              <select
                value={compoundStockId ?? ""}
                onChange={(e) => setCompoundStockId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
              >
                <option value="">Select compound</option>
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.compoundName} - Available: {s.quantityKg.toFixed(2)} kg
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compound Calculation</h3>
              {isCalculating ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600" />
                </div>
              ) : calculation ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600">Product:</span>
                    <p className="text-lg font-medium">{calculation.productTitle}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Specific Gravity:</span>
                    <p className="text-lg font-medium">{calculation.specificGravity}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Weight per Unit:</span>
                    <p className="text-lg font-medium">{calculation.kgPerUnit.toFixed(3)} kg</p>
                  </div>
                  <div className="border-t pt-4">
                    <span className="text-sm text-gray-600">Total Compound Required:</span>
                    <p
                      className={`text-2xl font-bold ${insufficientStock ? "text-red-600" : "text-green-600"}`}
                    >
                      {calculation.compoundRequiredKg.toFixed(2)} kg
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Enter product and dimensions to calculate compound requirement
                </p>
              )}
            </div>

            {selectedStock && (
              <div className={`rounded-lg p-6 ${insufficientStock ? "bg-red-50" : "bg-green-50"}`}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Compound Stock</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Compound:</span>
                    <span className="font-medium">{selectedStock.compoundName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Available:</span>
                    <span className="font-medium">{selectedStock.quantityKg.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="font-medium">{selectedStock.location || "-"}</span>
                  </div>
                  {insufficientStock && (
                    <div className="mt-4 p-3 bg-red-100 rounded-md">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-red-600 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-red-800">
                          Insufficient stock - need{" "}
                          {(
                            (calculation?.compoundRequiredKg || 0) - selectedStock.quantityKg
                          ).toFixed(2)}{" "}
                          kg more
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={() => router.push("/au-rubber/portal/productions")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !productId ||
              !compoundStockId ||
              !thicknessMm ||
              !widthMm ||
              !lengthM ||
              !quantity
            }
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Production"}
          </button>
        </div>
      </div>
    </div>
  );
}
