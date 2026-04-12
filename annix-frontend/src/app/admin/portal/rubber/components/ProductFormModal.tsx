"use client";

import { useMemo, useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import {
  CreateRubberProductDto,
  RubberProductDto,
  rubberPortalApi,
} from "@/app/lib/api/rubberPortalApi";
import { formDataFromProduct, INITIAL_FORM_DATA, ProductForm } from "./ProductForm";

interface ProductFormModalProps {
  isOpen: boolean;
  product: RubberProductDto | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ProductFormModal(props: ProductFormModalProps) {
  const { isOpen, product, onSave, onCancel } = props;
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
        await rubberPortalApi.updateProduct(product.id, dto);
      } else {
        await rubberPortalApi.createProduct(dto);
      }
      onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const title = isEditing ? "Edit Product" : "Create New Product";

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onCancel}
      onSubmit={() => {}}
      title={title}
      maxWidth="max-w-2xl"
      hideFooter
    >
      <ProductForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        submitLabel={isEditing ? "Update Product" : "Create Product"}
        isSaving={isSaving}
      />
    </FormModal>
  );
}
