"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CreateRubberProductDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import {
  useAuRubberCodings,
  useAuRubberCompanies,
  useAuRubberSpecifications,
} from "@/app/lib/query/hooks";

export interface ProductFormData {
  title: string;
  description: string;
  specificGravity: string;
  compoundOwnerFirebaseUid: string;
  compoundFirebaseUid: string;
  typeFirebaseUid: string;
  costPerKg: string;
  colourFirebaseUid: string;
  hardnessFirebaseUid: string;
  curingMethodFirebaseUid: string;
  gradeFirebaseUid: string;
  tensileStrengthMpa: string;
  elongationAtBreak: string;
  markup: string;
}

export const INITIAL_FORM_DATA: ProductFormData = {
  title: "",
  description: "",
  specificGravity: "",
  compoundOwnerFirebaseUid: "",
  compoundFirebaseUid: "",
  typeFirebaseUid: "",
  costPerKg: "",
  colourFirebaseUid: "",
  hardnessFirebaseUid: "",
  curingMethodFirebaseUid: "",
  gradeFirebaseUid: "",
  tensileStrengthMpa: "",
  elongationAtBreak: "",
  markup: "",
};

export function formDataFromProduct(product: RubberProductDto): ProductFormData {
  return {
    title: product.title || "",
    description: product.description || "",
    specificGravity: product.specificGravity?.toString() || "",
    compoundOwnerFirebaseUid: product.compoundOwnerFirebaseUid || "",
    compoundFirebaseUid: product.compoundFirebaseUid || "",
    typeFirebaseUid: product.typeFirebaseUid || "",
    costPerKg: product.costPerKg?.toString() || "",
    colourFirebaseUid: product.colourFirebaseUid || "",
    hardnessFirebaseUid: product.hardnessFirebaseUid || "",
    curingMethodFirebaseUid: product.curingMethodFirebaseUid || "",
    gradeFirebaseUid: product.gradeFirebaseUid || "",
    tensileStrengthMpa: product.tensileStrengthMpa?.toString() || "",
    elongationAtBreak: product.elongationAtBreak?.toString() || "",
    markup: product.markup?.toString() || "",
  };
}

export function formDataToDto(formData: ProductFormData): CreateRubberProductDto {
  return {
    title: formData.title.trim() || null,
    description: formData.description.trim() || null,
    specificGravity: formData.specificGravity ? parseFloat(formData.specificGravity) : null,
    compoundOwnerFirebaseUid: formData.compoundOwnerFirebaseUid || null,
    compoundFirebaseUid: formData.compoundFirebaseUid || null,
    typeFirebaseUid:
      formData.typeFirebaseUid && formData.typeFirebaseUid !== "NONE"
        ? formData.typeFirebaseUid
        : null,
    costPerKg: formData.costPerKg ? parseFloat(formData.costPerKg) : null,
    colourFirebaseUid: formData.colourFirebaseUid || null,
    hardnessFirebaseUid: formData.hardnessFirebaseUid || null,
    curingMethodFirebaseUid: formData.curingMethodFirebaseUid || null,
    gradeFirebaseUid: formData.gradeFirebaseUid || null,
    tensileStrengthMpa: formData.tensileStrengthMpa
      ? parseFloat(formData.tensileStrengthMpa)
      : null,
    elongationAtBreak: formData.elongationAtBreak ? parseInt(formData.elongationAtBreak, 10) : null,
    markup: formData.markup ? parseFloat(formData.markup) : null,
  };
}

interface ProductFormProps {
  initialData: ProductFormData;
  onSubmit: (dto: CreateRubberProductDto) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  isSaving: boolean;
}

export function ProductForm(props: ProductFormProps) {
  const { initialData, onSubmit, onCancel, submitLabel, isSaving } = props;
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const codingsQuery = useAuRubberCodings();
  const companiesQuery = useAuRubberCompanies();
  const specificationsQuery = useAuRubberSpecifications();
  const codings = codingsQuery.data ?? [];
  const companies = (companiesQuery.data ?? []).filter((c) => c.isCompoundOwner);
  const specifications = specificationsQuery.data ?? [];
  const isLoadingData =
    codingsQuery.isLoading || companiesQuery.isLoading || specificationsQuery.isLoading;
  const loadError = codingsQuery.error ?? companiesQuery.error ?? specificationsQuery.error;

  useEffect(() => {
    if (loadError) {
      setError("Failed to load form data");
    }
  }, [loadError]);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const codingsByType = (type: string) => codings.filter((c) => c.codingType === type);

  const COMPOUND_TO_TYPE_CODE: Record<string, string> = {
    NR: "1",
    SBR: "1",
    BR: "1",
    IR: "1",
    IIR: "2",
    BIIR: "2",
    CIIR: "2",
    NBR: "3",
    CR: "4",
    CSM: "5",
  };

  const typeForCompound = (compoundFirebaseUid: string): string => {
    const compound = codings.find(
      (c) => c.codingType === "COMPOUND" && c.firebaseUid === compoundFirebaseUid,
    );
    if (!compound) return "";
    const typeCode = COMPOUND_TO_TYPE_CODE[compound.code];
    if (!typeCode) return "";
    const typeCoding = codings.find((c) => c.codingType === "TYPE" && c.code === typeCode);
    return typeCoding?.firebaseUid ?? "";
  };

  const autoGradeResult = useMemo(() => {
    const tensile = parseFloat(formData.tensileStrengthMpa);
    const elongation = parseInt(formData.elongationAtBreak, 10);
    if (
      !formData.compoundFirebaseUid ||
      !formData.hardnessFirebaseUid ||
      Number.isNaN(tensile) ||
      Number.isNaN(elongation)
    ) {
      return null;
    }

    const compound = codings.find(
      (c) => c.codingType === "COMPOUND" && c.firebaseUid === formData.compoundFirebaseUid,
    );
    if (!compound) return null;

    const typeCode = COMPOUND_TO_TYPE_CODE[compound.code];
    if (!typeCode) return null;
    const typeNumber = parseInt(typeCode, 10);

    const hardnessCoding = codings.find(
      (c) => c.codingType === "HARDNESS" && c.firebaseUid === formData.hardnessFirebaseUid,
    );
    if (!hardnessCoding) return null;
    const hardnessIrhd = parseInt(hardnessCoding.code, 10);
    if (Number.isNaN(hardnessIrhd)) return null;

    const matchingSpecs = specifications.filter(
      (s) => s.typeNumber === typeNumber && s.hardnessClassIrhd === hardnessIrhd,
    );

    if (matchingSpecs.length === 0) {
      return null;
    }

    const gradeOrder = ["A", "B", "C", "D"];
    const sortedSpecs = [...matchingSpecs].sort(
      (a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade),
    );

    const matchedSpec = sortedSpecs.find(
      (s) =>
        tensile >= Number(s.tensileStrengthMpaMin) && elongation >= Number(s.elongationAtBreakMin),
    );

    if (matchedSpec) {
      const gradeCoding = codings.find(
        (c) => c.codingType === "GRADE" && c.code === matchedSpec.grade,
      );
      return {
        gradeFirebaseUid: gradeCoding?.firebaseUid ?? null,
        gradeName: matchedSpec.grade,
        belowMinimum: false,
      };
    }

    return { gradeFirebaseUid: null, gradeName: null, belowMinimum: true };
  }, [
    formData.compoundFirebaseUid,
    formData.hardnessFirebaseUid,
    formData.tensileStrengthMpa,
    formData.elongationAtBreak,
    codings,
    specifications,
  ]);

  const isGradeAutoSet =
    autoGradeResult !== null &&
    !autoGradeResult.belowMinimum &&
    autoGradeResult.gradeFirebaseUid !== null;
  const effectiveGradeUid = isGradeAutoSet
    ? autoGradeResult.gradeFirebaseUid!
    : formData.gradeFirebaseUid;

  const handleChange = (field: keyof ProductFormData, value: string) => {
    if (field === "compoundFirebaseUid") {
      const matchedType = value ? typeForCompound(value) : "";
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        typeFirebaseUid: value ? matchedType || "NONE" : prev.typeFirebaseUid,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setError(null);
      const effectiveFormData = isGradeAutoSet
        ? { ...formData, gradeFirebaseUid: autoGradeResult.gradeFirebaseUid! }
        : formData;
      const dto = formDataToDto(effectiveFormData);
      await onSubmit(dto);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save product";
      setError(errorMessage);
    }
  };

  const calculatedPrice = () => {
    const cost = parseFloat(formData.costPerKg) || 0;
    const markupPercent = parseFloat(formData.markup) || 100;
    return cost * (markupPercent / 100);
  };

  if (isLoadingData) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Product title"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="Product description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compound</label>
          <select
            value={formData.compoundFirebaseUid}
            onChange={(e) => handleChange("compoundFirebaseUid", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Select compound...</option>
            {codingsByType("COMPOUND").map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type (SANS 1198)</label>
          <select
            value={formData.typeFirebaseUid}
            onChange={(e) => handleChange("typeFirebaseUid", e.target.value)}
            disabled={formData.compoundFirebaseUid !== ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 disabled:text-gray-600"
          >
            <option value="">Select type...</option>
            <option value="NONE">None</option>
            {codingsByType("TYPE").map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
          {formData.compoundFirebaseUid && (
            <p className="mt-1 text-xs text-gray-500">Auto-set from compound per SANS 1198:2013</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
          <select
            value={formData.colourFirebaseUid}
            onChange={(e) => handleChange("colourFirebaseUid", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Select colour...</option>
            {codingsByType("COLOUR").map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hardness</label>
          <select
            value={formData.hardnessFirebaseUid}
            onChange={(e) => handleChange("hardnessFirebaseUid", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Select hardness...</option>
            {codingsByType("HARDNESS").map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tensile Strength (MPa)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.tensileStrengthMpa}
            onChange={(e) => handleChange("tensileStrengthMpa", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="e.g. 18.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Elongation at Break (%)
          </label>
          <input
            type="number"
            step="1"
            value={formData.elongationAtBreak}
            onChange={(e) => handleChange("elongationAtBreak", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="e.g. 500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
          <select
            value={effectiveGradeUid}
            onChange={(e) => handleChange("gradeFirebaseUid", e.target.value)}
            disabled={isGradeAutoSet}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100 disabled:text-gray-600"
          >
            <option value="">Select grade...</option>
            {codingsByType("GRADE").map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
          {isGradeAutoSet && (
            <p className="mt-1 text-xs text-gray-500">
              Auto-set to Grade {autoGradeResult.gradeName} from SANS 1198:2013 specifications
            </p>
          )}
          {autoGradeResult?.belowMinimum && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              Below minimum Grade C requirements for this type/hardness combination
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Curing Method</label>
          <select
            value={formData.curingMethodFirebaseUid}
            onChange={(e) => handleChange("curingMethodFirebaseUid", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Select curing method...</option>
            {codingsByType("CURING_METHOD").map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compound Owner</label>
          <select
            value={formData.compoundOwnerFirebaseUid}
            onChange={(e) => handleChange("compoundOwnerFirebaseUid", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          >
            <option value="">Select compound owner...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.firebaseUid}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specific Gravity</label>
          <input
            type="number"
            step="0.01"
            value={formData.specificGravity}
            onChange={(e) => handleChange("specificGravity", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="e.g., 1.15"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Pricing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost/kg (R)</label>
            <input
              type="number"
              step="0.01"
              value={formData.costPerKg}
              onChange={(e) => handleChange("costPerKg", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.markup}
              onChange={(e) => handleChange("markup", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price/kg (R)</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
              {calculatedPrice().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center"
        >
          {isSaving && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
