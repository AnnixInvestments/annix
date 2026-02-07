"use client";

import Link from "next/link";

export interface PumpProductCardData {
  id: number;
  sku: string;
  title: string;
  description?: string | null;
  pumpType: string;
  category: "centrifugal" | "positive_displacement" | "specialty";
  status: "active" | "inactive" | "discontinued";
  manufacturer: string;
  modelNumber?: string | null;
  flowRateMin?: number | null;
  flowRateMax?: number | null;
  headMin?: number | null;
  headMax?: number | null;
  motorPowerKw?: number | null;
  listPrice?: number | null;
  stockQuantity?: number;
  imageUrl?: string | null;
  certifications?: string[];
}

interface PumpProductCardProps {
  product: PumpProductCardData;
  onSelect?: (product: PumpProductCardData) => void;
  selected?: boolean;
  showActions?: boolean;
  linkTo?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  centrifugal: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  positive_displacement: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  specialty: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700" },
  inactive: { bg: "bg-yellow-100", text: "text-yellow-700" },
  discontinued: { bg: "bg-red-100", text: "text-red-700" },
};

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}

function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string,
): string {
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${min} - ${max} ${unit}`;
  }
  if (min !== null && min !== undefined) {
    return `${min}+ ${unit}`;
  }
  if (max !== null && max !== undefined) {
    return `Up to ${max} ${unit}`;
  }
  return "-";
}

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function PumpProductCard({
  product,
  onSelect,
  selected = false,
  showActions = true,
  linkTo,
}: PumpProductCardProps) {
  const categoryColor = CATEGORY_COLORS[product.category] || CATEGORY_COLORS.centrifugal;
  const statusColor = STATUS_COLORS[product.status] || STATUS_COLORS.active;

  const cardContent = (
    <div
      className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-md ${
        selected ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-200"
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={onSelect ? () => onSelect(product) : undefined}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColor.bg} ${categoryColor.text}`}
              >
                {categoryLabel(product.category)}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}
              >
                {product.status}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate">{product.title}</h3>
            <p className="text-sm text-gray-500">
              {product.manufacturer} {product.modelNumber && `- ${product.modelNumber}`}
            </p>
          </div>
          {product.imageUrl && (
            <div className="flex-shrink-0 ml-3">
              <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-gray-500">Flow Rate:</span>
            <span className="ml-1 font-medium text-gray-900">
              {formatRange(product.flowRateMin, product.flowRateMax, "m³/h")}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Head:</span>
            <span className="ml-1 font-medium text-gray-900">
              {formatRange(product.headMin, product.headMax, "m")}
            </span>
          </div>
          {product.motorPowerKw && (
            <div>
              <span className="text-gray-500">Motor:</span>
              <span className="ml-1 font-medium text-gray-900">{product.motorPowerKw} kW</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Stock:</span>
            <span
              className={`ml-1 font-medium ${(product.stockQuantity ?? 0) > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {(product.stockQuantity ?? 0) > 0
                ? `${product.stockQuantity} available`
                : "Out of stock"}
            </span>
          </div>
        </div>

        {product.certifications && product.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.certifications.slice(0, 3).map((cert) => (
              <span key={cert} className="px-1.5 py-0.5 text-xs rounded bg-amber-50 text-amber-700">
                {cert}
              </span>
            ))}
            {product.certifications.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                +{product.certifications.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            {product.listPrice ? (
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(product.listPrice)}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Request quote</span>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{product.sku}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{cardContent}</Link>;
  }

  return cardContent;
}

export default PumpProductCard;
