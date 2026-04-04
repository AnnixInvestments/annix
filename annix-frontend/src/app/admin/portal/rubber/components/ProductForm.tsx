"use client";

import { useEffect, useState } from "react";
import {
  BASE_INITIAL_FORM_DATA,
  BaseProductForm,
  type BaseProductFormData,
  baseFormDataFromProduct,
} from "@/app/components/rubber/product-form";
import {
  type CreateRubberProductDto,
  type RubberCompanyDto,
  type RubberProductCodingDto,
  rubberPortalApi,
} from "@/app/lib/api/rubberPortalApi";
import { log } from "@/app/lib/logger";

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
  const [codings, setCodings] = useState<RubberProductCodingDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setIsLoadingData(true);
        const [codingsData, companiesData] = await Promise.all([
          rubberPortalApi.productCodings(),
          rubberPortalApi.companies(),
        ]);
        setCodings(codingsData);
        setCompanies(companiesData);
      } catch (err) {
        log.error("Failed to load reference data:", err);
        setLoadError(err instanceof Error ? err : new Error("Failed to load form data"));
      } finally {
        setIsLoadingData(false);
      }
    };
    loadReferenceData();
  }, []);

  return (
    <BaseProductForm
      initialData={props.initialData}
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
      submitLabel={props.submitLabel}
      isSaving={props.isSaving}
      colorVariant="blue"
      codings={codings}
      companies={companies}
      specifications={null}
      isLoadingData={isLoadingData}
      loadError={loadError}
      sansMode={false}
    />
  );
}
