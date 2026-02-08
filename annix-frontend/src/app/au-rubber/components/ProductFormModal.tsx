"use client";

import { useMemo, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { CreateRubberProductDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { formDataFromProduct, INITIAL_FORM_DATA, ProductForm } from "./ProductForm";

interface ProductFormModalProps {
  isOpen: boolean;
  product: RubberProductDto | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductFormModal({ isOpen, product, onSave, onCancel }: ProductFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = product !== null;

  const initialData = useMemo(() => {
    if (product) {
      return formDataFromProduct(product);
    }
    return INITIAL_FORM_DATA;
  }, [product]);

  const handleSubmit = async (dto: CreateRubberProductDto) => {
    try {
      setIsSaving(true);
      if (isEditing && product) {
        await auRubberApiClient.updateProduct(product.id, dto);
      } else {
        await auRubberApiClient.createProduct(dto);
      }
      onSave();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Product" : "Create New Product"}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <ProductForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            submitLabel={isEditing ? "Update Product" : "Create Product"}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
