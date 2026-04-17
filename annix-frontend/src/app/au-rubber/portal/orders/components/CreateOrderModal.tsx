"use client";

import {
  LENGTH_OPTIONS,
  THICKNESS_OPTIONS,
  WIDTH_OPTIONS,
} from "@annix/product-data/rubber/dimensions";
import { Loader2, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { RubberCompanyDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";

type ProductType = "all" | "rubber" | "parts";

interface OrderLineItem {
  productId: number;
  productTitle: string;
  thickness: number | null;
  width: number | null;
  length: number | null;
  quantity: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (data: {
    companyId: number;
    companyOrderNumber: string;
    items: {
      productId: number;
      thickness?: number;
      width?: number;
      length?: number;
      quantity: number;
    }[];
  }) => Promise<void>;
  companies: RubberCompanyDto[];
  products: RubberProductDto[];
  isCreating: boolean;
}

const RUBBER_TYPE_NAMES = ["rubber sheet", "rubber roll", "rubber lining", "sheet", "roll"];

const isRubberProduct = (product: RubberProductDto): boolean => {
  const typeLower = product.typeName?.toLowerCase() || "";
  const titleLower = product.title?.toLowerCase() || "";
  return (
    RUBBER_TYPE_NAMES.some((name) => typeLower.includes(name) || titleLower.includes(name)) ||
    product.specificGravity !== null
  );
};

export function CreateOrderModal(props: CreateOrderModalProps) {
  const { isOpen, onClose, onCreateOrder, companies, products, isCreating } = props;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companyOrderNumber, setCompanyOrderNumber] = useState("");
  const [productType, setProductType] = useState<ProductType>("all");
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCompanyId(null);
      setCompanyOrderNumber("");
      setProductType("all");
      setLineItems([]);
    }
  }, [isOpen]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId],
  );

  const customerProducts = useMemo(() => {
    if (!selectedCompany) return [];
    const availableUids = new Set(selectedCompany.availableProducts);
    if (availableUids.size === 0) return products;
    return products.filter((p) => availableUids.has(p.firebaseUid));
  }, [selectedCompany, products]);

  const filteredProducts = useMemo(() => {
    if (productType === "all") return customerProducts;
    if (productType === "rubber") return customerProducts.filter(isRubberProduct);
    return customerProducts.filter((p) => !isRubberProduct(p));
  }, [customerProducts, productType]);

  const customers = useMemo(
    () => companies.filter((c) => c.companyType === "CUSTOMER"),
    [companies],
  );

  const addLineItem = (product: RubberProductDto) => {
    const rawProductTitle = product.title;
    const isRubber = isRubberProduct(product);
    setLineItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productTitle: rawProductTitle || "Untitled",
        thickness: isRubber ? THICKNESS_OPTIONS[0] : null,
        width: isRubber ? WIDTH_OPTIONS[0] : null,
        length: isRubber ? LENGTH_OPTIONS[0] : null,
        quantity: 1,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, updates: Partial<OrderLineItem>) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const handleSubmit = async () => {
    if (!selectedCompanyId || lineItems.length === 0) return;
    await onCreateOrder({
      companyId: selectedCompanyId,
      companyOrderNumber,
      items: lineItems.map((item) => {
        const rawItemThickness = item.thickness;
        const rawItemWidth = item.width;
        const rawItemLength = item.length;
        return {
          productId: item.productId,
          thickness: rawItemThickness || undefined,
          width: rawItemWidth || undefined,
          length: rawItemLength || undefined,
          quantity: item.quantity,
        };
      }),
    });
  };

  if (!isOpen) return null;

  const hasRubberProducts = customerProducts.some(isRubberProduct);
  const hasPartProducts = customerProducts.some((p) => !isRubberProduct(p));

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-gray-900">New Order</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select
                  value={selectedCompanyId || ""}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value ? Number(e.target.value) : null);
                    setLineItems([]);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select customer...</option>
                  {customers.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer PO Number
                </label>
                <input
                  type="text"
                  value={companyOrderNumber}
                  onChange={(e) => setCompanyOrderNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>

            {selectedCompanyId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProductType("all")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        productType === "all"
                          ? "bg-yellow-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      All Products
                    </button>
                    {hasRubberProducts && (
                      <button
                        onClick={() => setProductType("rubber")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          productType === "rubber"
                            ? "bg-yellow-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Rubber Rolls
                      </button>
                    )}
                    {hasPartProducts && (
                      <button
                        onClick={() => setProductType("parts")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          productType === "parts"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Pump Parts
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Products
                  </label>
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                      {customerProducts.length === 0
                        ? "No products linked to this customer. Link products in the Companies page."
                        : "No products match the selected type."}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {filteredProducts.map((product) => {
                        const rawProductTitle2 = product.title;
                        const alreadyAdded = lineItems.some((li) => li.productId === product.id);
                        return (
                          <div
                            key={product.id}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {rawProductTitle2 || "Untitled"}
                              </div>
                              <div className="flex gap-2 mt-0.5">
                                {product.typeName && (
                                  <span className="text-xs text-gray-500">{product.typeName}</span>
                                )}
                                {product.compoundName && (
                                  <span className="text-xs text-blue-600">
                                    {product.compoundName}
                                  </span>
                                )}
                                {product.hardnessName && (
                                  <span className="text-xs text-gray-400">
                                    {product.hardnessName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => addLineItem(product)}
                              disabled={alreadyAdded}
                              className={`ml-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md ${
                                alreadyAdded
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              {alreadyAdded ? "Added" : "Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {lineItems.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Items ({lineItems.length})
                    </label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Product
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Thickness (mm)
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Width (mm)
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Length (m)
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Qty
                            </th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineItems.map((item, index) => {
                            const rawItemThickness2 = item.thickness;
                            const rawItemWidth2 = item.width;
                            const rawItemLength2 = item.length;
                            const isRubber = item.thickness !== null;
                            return (
                              <tr key={`${item.productId}-${index}`} className="bg-white">
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {item.productTitle}
                                </td>
                                <td className="px-4 py-2">
                                  {isRubber ? (
                                    <select
                                      value={rawItemThickness2 || ""}
                                      onChange={(e) =>
                                        updateLineItem(index, {
                                          thickness: Number(e.target.value),
                                        })
                                      }
                                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                      {THICKNESS_OPTIONS.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {isRubber ? (
                                    <select
                                      value={rawItemWidth2 || ""}
                                      onChange={(e) =>
                                        updateLineItem(index, { width: Number(e.target.value) })
                                      }
                                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                      {WIDTH_OPTIONS.map((w) => (
                                        <option key={w} value={w}>
                                          {w}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {isRubber ? (
                                    <select
                                      value={rawItemLength2 || ""}
                                      onChange={(e) =>
                                        updateLineItem(index, { length: Number(e.target.value) })
                                      }
                                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                    >
                                      {LENGTH_OPTIONS.map((l) => (
                                        <option key={l} value={l}>
                                          {l}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateLineItem(index, {
                                        quantity: Math.max(1, Number(e.target.value)),
                                      })
                                    }
                                    className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    onClick={() => removeLineItem(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCompanyId || lineItems.length === 0 || isCreating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Create Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
