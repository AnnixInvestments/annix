"use client";

import {
  BASE_INITIAL_FORM_DATA,
  BaseProductForm,
  type BaseProductFormData,
  baseFormDataFromProduct,
} from "@/app/components/rubber/product-form";
import type { CreateRubberProductDto } from "@/app/lib/api/rubberPortalApi";
import {
  useAuRubberCodings,
  useAuRubberCompanies,
  useAuRubberSpecifications,
} from "@/app/lib/query/hooks";

export type ProductFormData = BaseProductFormData;
export const INITIAL_FORM_DATA = BASE_INITIAL_FORM_DATA;
export const formDataFromProduct = baseFormDataFromProduct;

interface ProductFormProps {
  initialData: ProductFormData;
  onSubmit: (dto: CreateRubberProductDto) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  isSaving: boolean;
}

export function ProductForm(props: ProductFormProps) {
  const codingsQuery = useAuRubberCodings();
  const companiesQuery = useAuRubberCompanies();
  const specificationsQuery = useAuRubberSpecifications();
  const rawCodingsQueryIsLoading = codingsQuery.isLoading;
  const rawCodingsQueryData = codingsQuery.data;
  const rawCompaniesQueryData = companiesQuery.data;
  const rawSpecificationsQueryData = specificationsQuery.data;

  const isLoadingData =
    rawCodingsQueryIsLoading || companiesQuery.isLoading || specificationsQuery.isLoading;
  const loadError =
    (codingsQuery.error as Error | null) ||
    (companiesQuery.error as Error | null) ||
    (specificationsQuery.error as Error | null) ||
    null;

  return (
    <BaseProductForm
      initialData={props.initialData}
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
      submitLabel={props.submitLabel}
      isSaving={props.isSaving}
      colorVariant="yellow"
      codings={rawCodingsQueryData ?? []}
      companies={rawCompaniesQueryData ?? []}
      specifications={rawSpecificationsQueryData ?? null}
      isLoadingData={isLoadingData}
      loadError={loadError}
      sansMode={true}
    />
  );
}
