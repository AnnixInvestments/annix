"use client";

import React, { useCallback, useState } from "react";
import { PumpProductCardData } from "./PumpProductCard";

interface PumpQuickQuoteProps {
  products: PumpProductCardData[];
  onSubmit: (quoteRequest: QuickQuoteRequest) => Promise<void>;
  onCancel?: () => void;
}

export interface QuickQuoteRequest {
  products: Array<{
    productId: number;
    sku: string;
    title: string;
    quantity: number;
    notes?: string;
  }>;
  customerInfo: {
    company: string;
    contactName: string;
    email: string;
    phone?: string;
  };
  projectInfo: {
    projectName?: string;
    requiredDate?: string;
    deliveryLocation?: string;
  };
  additionalNotes?: string;
}

interface ProductQuantity {
  productId: number;
  quantity: number;
  notes: string;
}

export function PumpQuickQuote({ products, onSubmit, onCancel }: PumpQuickQuoteProps) {
  const [step, setStep] = useState<"products" | "contact" | "review">("products");
  const [productQuantities, setProductQuantities] = useState<ProductQuantity[]>(
    products.map((p) => ({ productId: p.id, quantity: 1, notes: "" })),
  );
  const [customerInfo, setCustomerInfo] = useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
  });
  const [projectInfo, setProjectInfo] = useState({
    projectName: "",
    requiredDate: "",
    deliveryLocation: "",
  });
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setProductQuantities((prev) =>
      prev.map((pq) =>
        pq.productId === productId ? { ...pq, quantity: Math.max(1, quantity) } : pq,
      ),
    );
  }, []);

  const updateProductNotes = useCallback((productId: number, notes: string) => {
    setProductQuantities((prev) =>
      prev.map((pq) => (pq.productId === productId ? { ...pq, notes } : pq)),
    );
  }, []);

  const removeProduct = useCallback((productId: number) => {
    setProductQuantities((prev) => prev.filter((pq) => pq.productId !== productId));
  }, []);

  const activeProducts = products.filter((p) =>
    productQuantities.some((pq) => pq.productId === p.id),
  );

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === "products") {
      if (productQuantities.length === 0) {
        newErrors.products = "At least one product is required";
      }
    } else if (step === "contact") {
      if (!customerInfo.company.trim()) {
        newErrors.company = "Company name is required";
      }
      if (!customerInfo.contactName.trim()) {
        newErrors.contactName = "Contact name is required";
      }
      if (!customerInfo.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
        newErrors.email = "Invalid email format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, productQuantities, customerInfo]);

  const handleNext = useCallback(() => {
    if (!validateStep()) return;

    if (step === "products") {
      setStep("contact");
    } else if (step === "contact") {
      setStep("review");
    }
  }, [step, validateStep]);

  const handleBack = useCallback(() => {
    if (step === "contact") {
      setStep("products");
    } else if (step === "review") {
      setStep("contact");
    }
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;

    const quoteRequest: QuickQuoteRequest = {
      products: activeProducts.map((product) => {
        const pq = productQuantities.find((q) => q.productId === product.id)!;
        return {
          productId: product.id,
          sku: product.sku,
          title: product.title,
          quantity: pq.quantity,
          notes: pq.notes || undefined,
        };
      }),
      customerInfo: {
        company: customerInfo.company,
        contactName: customerInfo.contactName,
        email: customerInfo.email,
        phone: customerInfo.phone || undefined,
      },
      projectInfo: {
        projectName: projectInfo.projectName || undefined,
        requiredDate: projectInfo.requiredDate || undefined,
        deliveryLocation: projectInfo.deliveryLocation || undefined,
      },
      additionalNotes: additionalNotes || undefined,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(quoteRequest);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeProducts,
    productQuantities,
    customerInfo,
    projectInfo,
    additionalNotes,
    onSubmit,
    validateStep,
  ]);

  const totalProducts = productQuantities.reduce((sum, pq) => sum + pq.quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-3xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Quick Quote Request</h2>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {["products", "contact", "review"].map((s, index) => (
            <React.Fragment key={s}>
              <button
                onClick={() => {
                  if (
                    s === "products" ||
                    (s === "contact" && step !== "products") ||
                    (s === "review" && step === "review")
                  ) {
                    setStep(s as typeof step);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : ["products", "contact"].indexOf(step) >
                        ["products", "contact", "review"].indexOf(s)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {index + 1}
                </span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
              {index < 2 && (
                <svg
                  className="w-4 h-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="p-6">
        {step === "products" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Review and adjust quantities for the products you want to quote.
            </p>

            {errors.products && <div className="text-red-600 text-sm">{errors.products}</div>}

            <div className="space-y-3">
              {activeProducts.map((product) => {
                const pq = productQuantities.find((q) => q.productId === product.id)!;
                return (
                  <div
                    key={product.id}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg"
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{product.title}</h4>
                      <p className="text-sm text-gray-500">
                        {product.manufacturer} - {product.sku}
                      </p>
                      <div className="mt-2">
                        <input
                          type="text"
                          value={pq.notes}
                          onChange={(e) => updateProductNotes(product.id, e.target.value)}
                          placeholder="Add notes for this item..."
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, pq.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                        disabled={pq.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={pq.quantity}
                        onChange={(e) =>
                          updateQuantity(product.id, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-16 text-center border border-gray-300 rounded py-1"
                        min={1}
                      />
                      <button
                        onClick={() => updateQuantity(product.id, pq.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="ml-2 text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">
                Total: <span className="font-medium">{totalProducts} items</span> across{" "}
                <span className="font-medium">{activeProducts.length} products</span>
              </span>
            </div>
          </div>
        )}

        {step === "contact" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your contact information so we can get back to you with a quote.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerInfo.company}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, company: e.target.value }))
                  }
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.company ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.company && <p className="text-red-500 text-sm mt-1">{errors.company}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerInfo.contactName}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, contactName: e.target.value }))
                  }
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.contactName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.contactName && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <hr className="my-4" />

            <h3 className="font-medium text-gray-900">Project Details (Optional)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectInfo.projectName}
                  onChange={(e) =>
                    setProjectInfo((prev) => ({ ...prev, projectName: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required By</label>
                <input
                  type="date"
                  value={projectInfo.requiredDate}
                  onChange={(e) =>
                    setProjectInfo((prev) => ({ ...prev, requiredDate: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Location
                </label>
                <input
                  type="text"
                  value={projectInfo.deliveryLocation}
                  onChange={(e) =>
                    setProjectInfo((prev) => ({ ...prev, deliveryLocation: e.target.value }))
                  }
                  placeholder="City, Province or full address"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                placeholder="Any special requirements, configurations, or questions..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">Review your quote request before submitting.</p>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Products ({totalProducts} items)</h3>
              <div className="space-y-2">
                {activeProducts.map((product) => {
                  const pq = productQuantities.find((q) => q.productId === product.id)!;
                  return (
                    <div key={product.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{product.title}</span>
                      <span className="font-medium">x{pq.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Company:</span>
                <span className="text-gray-900">{customerInfo.company}</span>
                <span className="text-gray-500">Contact:</span>
                <span className="text-gray-900">{customerInfo.contactName}</span>
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-900">{customerInfo.email}</span>
                {customerInfo.phone && (
                  <>
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{customerInfo.phone}</span>
                  </>
                )}
              </div>
            </div>

            {(projectInfo.projectName ||
              projectInfo.requiredDate ||
              projectInfo.deliveryLocation) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Project Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {projectInfo.projectName && (
                    <>
                      <span className="text-gray-500">Project:</span>
                      <span className="text-gray-900">{projectInfo.projectName}</span>
                    </>
                  )}
                  {projectInfo.requiredDate && (
                    <>
                      <span className="text-gray-500">Required by:</span>
                      <span className="text-gray-900">{projectInfo.requiredDate}</span>
                    </>
                  )}
                  {projectInfo.deliveryLocation && (
                    <>
                      <span className="text-gray-500">Delivery:</span>
                      <span className="text-gray-900">{projectInfo.deliveryLocation}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {additionalNotes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Additional Notes</h3>
                <p className="text-sm text-gray-700">{additionalNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div>
          {step !== "products" && (
            <button onClick={handleBack} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          {step !== "review" ? (
            <button
              onClick={handleNext}
              disabled={activeProducts.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  Submit Quote Request
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PumpQuickQuote;
