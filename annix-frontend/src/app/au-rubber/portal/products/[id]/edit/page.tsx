"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { CreateRubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { useRubberProductDetail } from "@/app/lib/query/hooks";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import {
  formDataFromProduct,
  INITIAL_FORM_DATA,
  ProductForm,
} from "../../../../components/ProductForm";

export default function AuRubberProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);
  const { showToast } = useToast();

  const productQuery = useRubberProductDetail(productId);
  const product = productQuery.data ?? null;
  const [isSaving, setIsSaving] = useState(false);

  const initialData = useMemo(() => {
    if (product) {
      return formDataFromProduct(product);
    }
    return INITIAL_FORM_DATA;
  }, [product]);

  const handleSubmit = async (dto: CreateRubberProductDto) => {
    try {
      setIsSaving(true);
      await auRubberApiClient.updateProduct(productId, dto);
      showToast("Product updated", "success");
      router.push("/au-rubber/portal/products");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update product";
      showToast(errorMessage, "error");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/au-rubber/portal/products");
  };

  if (productQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (productQuery.error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Product</div>
          <p className="text-gray-600">
            {productQuery.error instanceof Error
              ? productQuery.error.message
              : "Failed to load product"}
          </p>
          <button
            onClick={() => productQuery.refetch()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-semibold mb-2">Product Not Found</div>
          <Link href="/au-rubber/portal/products" className="text-yellow-600 hover:text-yellow-800">
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
          { label: "Products", href: "/au-rubber/portal/products" },
          { label: product.title || `Product #${product.id}` },
          { label: "Edit" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-sm text-gray-600">
            Update the details for {product.title || `Product #${product.id}`}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <ProductForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Update Product"
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
