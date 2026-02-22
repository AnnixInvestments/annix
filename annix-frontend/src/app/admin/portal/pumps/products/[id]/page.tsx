"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  API_610_PUMP_TYPES,
  PUMP_MANUFACTURERS,
  PUMP_PRICING_TIERS,
  PUMP_SPECIFICATIONS,
  PUMP_TYPES,
} from "@product-data/pumps";
import { Breadcrumb } from "../../components/Breadcrumb";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value || "-"}</dd>
    </div>
  );
}

function PropertyBadge({ label, color }: { label: string; color: string }) {
  return <span className={`px-3 py-1 text-sm font-medium rounded-full ${color}`}>{label}</span>;
}

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString("en-ZA")}`;
}

export default function PumpProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = decodeURIComponent(params.id as string);

  const product = PUMP_TYPES.find((t) => t.value === productId);
  const api610Type = API_610_PUMP_TYPES.find((t) =>
    t.typicalApplications.some((app: string) =>
      product?.label.toLowerCase().includes(app.toLowerCase().split(" ")[0]),
    ),
  );

  const pricingTier =
    PUMP_PRICING_TIERS.newPumps.find((tier) =>
      tier.value.toLowerCase().includes(product?.category.toLowerCase() || ""),
    ) || PUMP_PRICING_TIERS.newPumps[0];

  const relevantManufacturers = PUMP_MANUFACTURERS.filter((mfr) =>
    (mfr.productsOffered ?? []).some(
      (productOffered: string) =>
        product?.category.toLowerCase().includes(productOffered.toLowerCase()) ||
        productOffered.toLowerCase().includes(product?.category.toLowerCase() || ""),
    ),
  );

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-semibold mb-2">Product Not Found</div>
          <p className="text-gray-400 mb-4">The pump type you are looking for does not exist.</p>
          <Link href="/admin/portal/pumps/products" className="text-blue-600 hover:text-blue-800">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Products", href: "/admin/portal/pumps/products" },
          { label: product.label },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.label}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {product.category} pump - {product.apiStandard || "General purpose"}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/admin/portal/pumps/products")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => {}}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Product Properties</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <PropertyBadge
                label={product.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                color={
                  product.category === "centrifugal"
                    ? "bg-blue-100 text-blue-700"
                    : product.category === "positive_displacement"
                      ? "bg-green-100 text-green-700"
                      : "bg-purple-100 text-purple-700"
                }
              />
              {product.apiStandard && (
                <PropertyBadge label={product.apiStandard} color="bg-amber-100 text-amber-700" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
          </div>
          <div className="px-6 py-4">
            <dl className="divide-y divide-gray-200">
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Price Range</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {formatCurrency(pricingTier.basePriceRange.min)} -{" "}
                  {formatCurrency(pricingTier.basePriceRange.max)}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Unit</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {pricingTier.unit}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Product Details</h2>
        </div>
        <div className="px-6 py-4">
          <dl className="divide-y divide-gray-200">
            <InfoRow label="Pump Type" value={product.label} />
            <InfoRow label="Type Code" value={product.value} />
            <InfoRow label="Category" value={product.category} />
            <InfoRow label="API Standard" value={product.apiStandard} />
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Available Materials</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Casing Materials</h3>
              <div className="flex flex-wrap gap-1">
                {PUMP_SPECIFICATIONS.materials.casing.slice(0, 6).map((mat) => (
                  <span
                    key={mat.value}
                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                  >
                    {mat.label}
                  </span>
                ))}
                {PUMP_SPECIFICATIONS.materials.casing.length > 6 && (
                  <span className="px-2 py-1 text-xs rounded bg-gray-50 text-gray-500">
                    +{PUMP_SPECIFICATIONS.materials.casing.length - 6} more
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Impeller Materials</h3>
              <div className="flex flex-wrap gap-1">
                {PUMP_SPECIFICATIONS.materials.impeller.slice(0, 6).map((mat) => (
                  <span
                    key={mat.value}
                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                  >
                    {mat.label}
                  </span>
                ))}
                {PUMP_SPECIFICATIONS.materials.impeller.length > 6 && (
                  <span className="px-2 py-1 text-xs rounded bg-gray-50 text-gray-500">
                    +{PUMP_SPECIFICATIONS.materials.impeller.length - 6} more
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Seal Types</h3>
              <div className="flex flex-wrap gap-1">
                {PUMP_SPECIFICATIONS.materials.seal.map((seal) => (
                  <span
                    key={seal.value}
                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                  >
                    {seal.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {api610Type && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">API 610 Classification</h2>
          </div>
          <div className="px-6 py-4">
            <dl className="divide-y divide-gray-200">
              <InfoRow label="API Type" value={`${api610Type.code} - ${api610Type.name}`} />
              <InfoRow label="Category" value={api610Type.category} />
              <InfoRow label="Configuration" value={api610Type.configuration} />
              <InfoRow label="Bearing Arrangement" value={api610Type.bearingArrangement} />
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-500 mb-2">Operating Limits</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <div className="grid grid-cols-2 gap-2">
                    <span>Max Temp: {api610Type.operatingLimits.maxTemperatureC}°C</span>
                    <span>Max Pressure: {api610Type.operatingLimits.maxPressureBar} bar</span>
                    <span>Max Power: {api610Type.operatingLimits.maxPowerKw} kW</span>
                    <span>Max Speed: {api610Type.operatingLimits.maxSpeedRpm} RPM</span>
                  </div>
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-500 mb-2">Typical Applications</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <ul className="list-disc list-inside">
                    {api610Type.typicalApplications.map((app) => (
                      <li key={app}>{app}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {relevantManufacturers.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recommended Manufacturers</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relevantManufacturers.map((mfr) => (
                <div key={mfr.name} className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{mfr.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{mfr.description}</p>
                  {mfr.url && (
                    <a
                      href={mfr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Website
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400"
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
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Pump Selection Tip</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                When selecting a pump, consider the application requirements including flow rate,
                head, fluid properties (viscosity, temperature, solids content), and system
                conditions. Use our pump selection guide for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
