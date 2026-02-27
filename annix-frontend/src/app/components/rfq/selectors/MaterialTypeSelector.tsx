"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PipeMaterialType } from "@/app/lib/hooks/useRfqForm";

export type ItemType = "pipe" | "bend" | "fitting";

export interface MaterialTypeSelectorProps {
  selectedMaterials: string[];
  onSelectMaterial: (material: PipeMaterialType) => void;
  onAddItem?: (material: PipeMaterialType, itemType: ItemType) => void;
  disabled?: boolean;
  fittingsDisabled?: boolean;
}

interface MaterialOption {
  value: PipeMaterialType;
  label: string;
  shortLabel: string;
  bgColor: string;
  hoverColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const MATERIAL_OPTIONS: MaterialOption[] = [
  {
    value: "steel",
    label: "Steel Pipe",
    shortLabel: "Steel",
    bgColor: "bg-blue-100",
    hoverColor: "hover:bg-blue-200",
    borderColor: "border-blue-300",
    textColor: "text-blue-700",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    value: "hdpe",
    label: "HDPE Pipe",
    shortLabel: "HDPE",
    bgColor: "bg-gray-800",
    hoverColor: "hover:bg-gray-900",
    borderColor: "border-gray-700",
    textColor: "text-white",
    icon: <span className="text-xs font-bold">PE</span>,
  },
  {
    value: "pvc",
    label: "PVC Pipe",
    shortLabel: "PVC",
    bgColor: "bg-blue-400",
    hoverColor: "hover:bg-blue-500",
    borderColor: "border-blue-300",
    textColor: "text-white",
    icon: <span className="text-xs font-bold">PVC</span>,
  },
];

function MaterialDropdownButton({
  material,
  disabled,
  fittingsDisabled,
  onAddItem,
}: {
  material: MaterialOption;
  disabled?: boolean;
  fittingsDisabled?: boolean;
  onAddItem: (itemType: ItemType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const itemTypes: { type: ItemType; label: string }[] = [
    { type: "pipe", label: "Pipe" },
    { type: "bend", label: "Bend" },
    { type: "fitting", label: "Fitting" },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors ${
          disabled
            ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-50"
            : `${material.bgColor} ${material.hoverColor} ${material.borderColor}`
        }`}
      >
        <svg
          className={`w-4 h-4 ${disabled ? "text-gray-400" : material.textColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span
          className={`text-xs font-semibold ${disabled ? "text-gray-500" : material.textColor}`}
        >
          {material.shortLabel}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""} ${disabled ? "text-gray-400" : material.textColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
          {itemTypes.map((item) => {
            const isDisabled = item.type === "fitting" && fittingsDisabled;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    onAddItem(item.type);
                    setIsOpen(false);
                  }
                }}
                disabled={isDisabled}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  isDisabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MaterialTypeSelector({
  selectedMaterials,
  onSelectMaterial,
  onAddItem,
  disabled,
  fittingsDisabled,
}: MaterialTypeSelectorProps) {
  const availableMaterials = MATERIAL_OPTIONS.filter((opt) => {
    const productKey = opt.value === "steel" ? "fabricated_steel" : opt.value;
    return selectedMaterials.includes(productKey);
  });

  if (availableMaterials.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-gray-500 font-medium">Add:</span>
      {availableMaterials.map((material) => (
        <MaterialDropdownButton
          key={material.value}
          material={material}
          disabled={disabled}
          fittingsDisabled={fittingsDisabled}
          onAddItem={(itemType) => {
            if (onAddItem) {
              onAddItem(material.value, itemType);
            } else {
              onSelectMaterial(material.value);
            }
          }}
        />
      ))}
    </div>
  );
}

export interface MaterialBadgeProps {
  material: PipeMaterialType;
  onClear: () => void;
}

export function MaterialBadge({ material, onClear }: MaterialBadgeProps) {
  const option = MATERIAL_OPTIONS.find((o) => o.value === material);
  if (!option) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${option.bgColor} ${option.borderColor} border`}
    >
      <span className={`text-xs font-semibold ${option.textColor}`}>{option.shortLabel}</span>
      <button type="button" onClick={onClear} className={`${option.textColor} hover:opacity-70`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export interface ItemTypeButtonsProps {
  material: PipeMaterialType;
  onAddPipe: () => void;
  onAddBend: () => void;
  onAddFitting: () => void;
  disabled?: boolean;
  fittingsDisabled?: boolean;
}

export function ItemTypeButtons({
  material,
  onAddPipe,
  onAddBend,
  onAddFitting,
  disabled,
  fittingsDisabled,
}: ItemTypeButtonsProps) {
  const option = MATERIAL_OPTIONS.find((o) => o.value === material);
  const baseClasses = option
    ? `${option.bgColor} ${option.hoverColor} ${option.borderColor}`
    : "bg-blue-100 hover:bg-blue-200 border-blue-300";
  const textClass = option?.textColor ?? "text-blue-700";

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onAddPipe}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
          disabled ? "bg-gray-100 border-gray-300 cursor-not-allowed" : baseClasses
        }`}
      >
        <svg
          className={`w-4 h-4 ${disabled ? "text-gray-400" : textClass}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className={`text-xs font-semibold ${disabled ? "text-gray-500" : textClass}`}>
          Pipe
        </span>
      </button>

      <button
        type="button"
        onClick={onAddBend}
        disabled={disabled}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
          disabled
            ? "bg-gray-100 border-gray-300 cursor-not-allowed"
            : "bg-purple-100 hover:bg-purple-200 border-purple-300"
        }`}
      >
        <svg
          className={`w-4 h-4 ${disabled ? "text-gray-400" : "text-purple-600"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className={`text-xs font-semibold ${disabled ? "text-gray-500" : "text-purple-700"}`}>
          Bend
        </span>
      </button>

      <button
        type="button"
        onClick={onAddFitting}
        disabled={disabled || fittingsDisabled}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
          disabled || fittingsDisabled
            ? "bg-gray-100 border-gray-300 cursor-not-allowed"
            : "bg-green-100 hover:bg-green-200 border-green-300"
        }`}
      >
        {(disabled || fittingsDisabled) && (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <svg
          className={`w-4 h-4 ${disabled || fittingsDisabled ? "text-gray-400" : "text-green-600"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span
          className={`text-xs font-semibold ${disabled || fittingsDisabled ? "text-gray-500" : "text-green-700"}`}
        >
          Fitting
        </span>
      </button>
    </div>
  );
}

export interface FirstItemMaterialSelectorProps {
  selectedMaterials: string[];
  onAddItem: (material: PipeMaterialType, itemType: ItemType) => void;
  fittingsDisabled?: boolean;
}

function FirstItemMaterialCard({
  material,
  fittingsDisabled,
  onAddItem,
}: {
  material: MaterialOption;
  fittingsDisabled?: boolean;
  onAddItem: (itemType: ItemType) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const itemTypes: { type: ItemType; label: string; description: string }[] = [
    { type: "pipe", label: "Straight Pipe", description: "Straight pipe section" },
    { type: "bend", label: "Bend Section", description: "Pipe bends and elbows" },
    { type: "fitting", label: "Fitting", description: "Tees, reducers, laterals" },
  ];

  const bgColorMap: Record<string, string> = {
    steel: "bg-blue-600 hover:bg-blue-700",
    hdpe: "bg-gray-800 hover:bg-gray-900",
    pvc: "bg-blue-400 hover:bg-blue-500",
  };

  const ringColorMap: Record<string, string> = {
    steel: "focus:ring-blue-300",
    hdpe: "focus:ring-gray-500",
    pvc: "focus:ring-blue-200",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col items-center justify-center w-48 h-40 text-white rounded-xl focus:outline-none focus:ring-4 transition-all shadow-lg hover:shadow-xl ${bgColorMap[material.value]} ${ringColorMap[material.value]}`}
      >
        <div className="w-12 h-12 mb-3 flex items-center justify-center">
          {material.value === "steel" ? (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          ) : (
            <span className="text-2xl font-bold">{material.shortLabel}</span>
          )}
        </div>
        <span className="text-lg font-semibold">{material.label}</span>
        <span className="text-xs text-white/70 mt-1 flex items-center gap-1">
          Select type
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {itemTypes.map((item) => {
            const isDisabled = item.type === "fitting" && fittingsDisabled;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    onAddItem(item.type);
                    setIsOpen(false);
                  }
                }}
                disabled={isDisabled}
                className={`w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                  isDisabled
                    ? "text-gray-400 cursor-not-allowed bg-gray-50"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="font-medium">{item.label}</div>
                <div className={`text-xs ${isDisabled ? "text-gray-400" : "text-gray-500"}`}>
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FirstItemMaterialSelector({
  selectedMaterials,
  onAddItem,
  fittingsDisabled,
}: FirstItemMaterialSelectorProps) {
  const availableMaterials = MATERIAL_OPTIONS.filter((opt) => {
    const productKey = opt.value === "steel" ? "fabricated_steel" : opt.value;
    return selectedMaterials.includes(productKey);
  });

  if (availableMaterials.length === 0) {
    return null;
  }

  return (
    <>
      {availableMaterials.map((material) => (
        <FirstItemMaterialCard
          key={material.value}
          material={material}
          fittingsDisabled={fittingsDisabled}
          onAddItem={(itemType) => onAddItem(material.value, itemType)}
        />
      ))}
    </>
  );
}
