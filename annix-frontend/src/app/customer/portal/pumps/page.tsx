"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FeatureGate } from "@/app/components/FeatureGate";
import { PumpProductBrowser } from "@/app/components/pumps";
import type { PumpProductCardData } from "@/app/components/pumps/PumpProductCard";
import { useToast } from "@/app/components/Toast";
import { useCustomerAuth } from "@/app/context/CustomerAuthContext";
import { PumpProduct, pumpProductApi } from "@/app/lib/api/client";
import { log } from "@/app/lib/logger";

const FALLBACK_PRODUCTS: PumpProductCardData[] = [
  {
    id: 1,
    sku: "KSB-ETN-50-200",
    title: "KSB Etanorm 50-200",
    description: "Single-stage end suction pump for clean water applications",
    pumpType: "end_suction",
    category: "centrifugal",
    status: "active",
    manufacturer: "KSB",
    modelNumber: "ETN 50-200",
    flowRateMin: 20,
    flowRateMax: 100,
    headMin: 20,
    headMax: 65,
    motorPowerKw: 7.5,
    listPrice: 45000,
    stockQuantity: 3,
    certifications: ["ISO 9001", "CE"],
  },
  {
    id: 2,
    sku: "GRU-CR-15-4",
    title: "Grundfos CR 15-4",
    description: "Vertical multistage centrifugal pump for pressure boosting",
    pumpType: "multistage",
    category: "centrifugal",
    status: "active",
    manufacturer: "Grundfos",
    modelNumber: "CR 15-4",
    flowRateMin: 5,
    flowRateMax: 20,
    headMin: 30,
    headMax: 120,
    motorPowerKw: 5.5,
    listPrice: 38000,
    stockQuantity: 5,
    certifications: ["ISO 9001", "WRAS"],
  },
  {
    id: 3,
    sku: "WEI-WBH-100",
    title: "Weir Warman WBH 100",
    description: "Heavy duty slurry pump for mining applications",
    pumpType: "slurry",
    category: "specialty",
    status: "active",
    manufacturer: "Weir Minerals",
    modelNumber: "WBH 100",
    flowRateMin: 50,
    flowRateMax: 300,
    headMin: 10,
    headMax: 60,
    motorPowerKw: 45,
    listPrice: 185000,
    stockQuantity: 1,
    certifications: ["ISO 9001", "ATEX"],
  },
  {
    id: 4,
    sku: "NTZ-NM-053",
    title: "NETZSCH NM 053",
    description: "Progressive cavity pump for viscous fluids",
    pumpType: "progressive_cavity",
    category: "positive_displacement",
    status: "active",
    manufacturer: "NETZSCH",
    modelNumber: "NM 053",
    flowRateMin: 0.5,
    flowRateMax: 15,
    headMin: 5,
    headMax: 48,
    motorPowerKw: 3,
    listPrice: 52000,
    stockQuantity: 2,
    certifications: ["ISO 9001", "FDA"],
  },
  {
    id: 5,
    sku: "SUL-ZLN-125",
    title: "Sulzer ZLN 125-250",
    description: "API 610 OH2 process pump for petrochemical applications",
    pumpType: "process",
    category: "centrifugal",
    status: "active",
    manufacturer: "Sulzer",
    modelNumber: "ZLN 125-250",
    flowRateMin: 80,
    flowRateMax: 350,
    headMin: 30,
    headMax: 120,
    motorPowerKw: 55,
    listPrice: 285000,
    stockQuantity: 0,
    certifications: ["API 610", "ATEX", "ISO 9001"],
  },
];

function mapApiProductToCardData(product: PumpProduct): PumpProductCardData {
  const statusMap: Record<string, "active" | "inactive" | "discontinued"> = {
    ACTIVE: "active",
    DISCONTINUED: "discontinued",
    OUT_OF_STOCK: "inactive",
  };

  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    description: product.description,
    pumpType: product.pumpType,
    category: product.category.toLowerCase() as
      | "centrifugal"
      | "positive_displacement"
      | "specialty",
    status: statusMap[product.status] || "active",
    manufacturer: product.manufacturer,
    modelNumber: product.modelNumber,
    flowRateMin: product.flowRateMin,
    flowRateMax: product.flowRateMax,
    headMin: product.headMin,
    headMax: product.headMax,
    motorPowerKw: product.motorPowerKw,
    listPrice: product.listPrice,
    stockQuantity: product.stockQuantity,
    certifications: product.certifications,
  };
}

export default function CustomerPumpsPage() {
  return (
    <FeatureGate featureFlag="CUSTOMER_PUMPS" fallbackPath="/customer/portal/rfqs/create">
      <CustomerPumpsContent />
    </FeatureGate>
  );
}

function CustomerPumpsContent() {
  const router = useRouter();
  const { customer } = useCustomerAuth();
  const { showToast } = useToast();
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<PumpProductCardData[]>([]);
  const [requirements, setRequirements] = useState<any>(null);
  const [products, setProducts] = useState<PumpProductCardData[]>(FALLBACK_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await pumpProductApi.list({ status: "ACTIVE", limit: 100 });
        if (response.items && response.items.length > 0) {
          const mappedProducts = response.items.map(mapApiProductToCardData);
          setProducts(mappedProducts);
          setUsingFallback(false);
        } else {
          setProducts(FALLBACK_PRODUCTS);
          setUsingFallback(true);
        }
      } catch (error) {
        log.warn("Failed to fetch pump products from API, using fallback data", error);
        setProducts(FALLBACK_PRODUCTS);
        setUsingFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleRequestQuote = useCallback((selectedProds: PumpProductCardData[], reqs?: any) => {
    setSelectedProducts(selectedProds);
    setRequirements(reqs);
    setShowQuoteModal(true);
  }, []);

  const handleProductDetail = useCallback(
    (product: PumpProductCardData) => {
      showToast(`Viewing details for ${product.title}`, "info");
    },
    [showToast],
  );

  const handleSubmitQuoteRequest = useCallback(() => {
    showToast(
      "Quote request submitted successfully. You will receive quotes from our suppliers soon.",
      "success",
    );
    setShowQuoteModal(false);
    setSelectedProducts([]);
    setRequirements(null);
  }, [showToast]);

  const handleCreateRfq = useCallback(() => {
    router.push("/customer/portal/rfqs/create");
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pump Catalog</h1>
          <p className="mt-1 text-gray-600">
            Browse our selection of industrial pumps or use the selection wizard to find the right
            pump for your application
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateRfq}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Pump RFQ
          </button>
          <Link
            href="/customer/portal/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {usingFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-amber-800">
              Showing sample catalog data. Live product data will be available once connected to the
              inventory system.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading pump catalog...</span>
        </div>
      ) : (
        <PumpProductBrowser
          products={products}
          onRequestQuote={handleRequestQuote}
          onProductDetail={handleProductDetail}
          showSelectionWizard={true}
          showApi610Wizard={true}
        />
      )}

      {showQuoteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowQuoteModal(false)}
            />
            <div className="relative bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Request Quote</h3>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Products ({selectedProducts.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{product.title}</p>
                        <p className="text-sm text-gray-500">
                          {product.manufacturer} - {product.sku}
                        </p>
                      </div>
                      {product.listPrice && (
                        <span className="text-sm font-medium text-gray-700">
                          R {product.listPrice.toLocaleString("en-ZA")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {requirements && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Selection Requirements</h4>
                  <p className="text-sm text-blue-700">
                    {requirements.api610
                      ? `API 610 Category: ${requirements.api610.categoryRecommendation}`
                      : (requirements.recommendedTypes?.[0]?.type?.label ??
                        "Based on your application requirements")}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Requirements (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any specific requirements, delivery timeline, or questions..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Required
                </label>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitQuoteRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Submit Quote Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
