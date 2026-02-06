'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRubberProductDetail } from '@/app/lib/query/hooks';
import { Breadcrumb } from '../../components/Breadcrumb';

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value || '-'}</dd>
    </div>
  );
}

function PropertyBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${color}`}>
      {label}
    </span>
  );
}

export default function RubberProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);

  const productQuery = useRubberProductDetail(productId);
  const product = productQuery.data ?? null;

  if (productQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          <p className="text-gray-600">{productQuery.error instanceof Error ? productQuery.error.message : 'Failed to load product'}</p>
          <button onClick={() => productQuery.refetch()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
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
          <p className="text-gray-400 mb-4">The product you are looking for does not exist or has been deleted.</p>
          <Link href="/admin/portal/rubber/products" className="text-blue-600 hover:text-blue-800">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const calculatedPricePerKg = product.costPerKg && product.markup
    ? product.costPerKg * (1 + product.markup / 100)
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Products', href: '/admin/portal/rubber/products' }, { label: product.title || 'Untitled Product' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.title || 'Untitled Product'}</h1>
          {product.description && (
            <p className="mt-1 text-sm text-gray-600">{product.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/admin/portal/rubber/products')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back
          </button>
          <Link
            href={`/admin/portal/rubber/products/${product.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Product
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Product Properties</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {product.typeName && (
                <PropertyBadge label={product.typeName} color="bg-indigo-100 text-indigo-700" />
              )}
              {product.compoundName && (
                <PropertyBadge label={product.compoundName} color="bg-amber-100 text-amber-700" />
              )}
              {product.colourName && (
                <PropertyBadge label={product.colourName} color="bg-gray-100 text-gray-700" />
              )}
              {product.hardnessName && (
                <PropertyBadge label={product.hardnessName} color="bg-blue-100 text-blue-700" />
              )}
              {product.gradeName && (
                <PropertyBadge label={product.gradeName} color="bg-green-100 text-green-700" />
              )}
              {product.curingMethodName && (
                <PropertyBadge label={product.curingMethodName} color="bg-purple-100 text-purple-700" />
              )}
              {!product.typeName && !product.compoundName && !product.colourName && !product.hardnessName && !product.gradeName && !product.curingMethodName && (
                <span className="text-sm text-gray-500">No properties assigned</span>
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
                <dt className="text-sm font-medium text-gray-500">Cost per kg</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{formatCurrency(product.costPerKg)}</dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Markup</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{product.markup !== null ? `${product.markup}%` : '-'}</dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Price per kg</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 sm:col-span-2 sm:mt-0">{formatCurrency(product.pricePerKg)}</dd>
              </div>
            </dl>
            {product.costPerKg !== null && product.markup !== null && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">Calculation:</span> {formatCurrency(product.costPerKg)} x (1 + {product.markup}% / 100) = {formatCurrency(calculatedPricePerKg)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Product Details</h2>
        </div>
        <div className="px-6 py-4">
          <dl className="divide-y divide-gray-200">
            <InfoRow label="Type" value={product.typeName} />
            <InfoRow label="Compound" value={product.compoundName} />
            <InfoRow label="Compound Owner" value={product.compoundOwnerName} />
            <InfoRow label="Colour" value={product.colourName} />
            <InfoRow label="Hardness" value={product.hardnessName} />
            <InfoRow label="Grade" value={product.gradeName} />
            <InfoRow label="Curing Method" value={product.curingMethodName} />
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Specific Gravity</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {product.specificGravity !== null ? product.specificGravity.toFixed(2) : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Pricing Formula</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p><span className="font-medium">Price per kg</span> = Cost per kg x (1 + Markup% / 100)</p>
              <p><span className="font-medium">Sale price per kg</span> = Price per kg x Company Pricing Factor</p>
              <p><span className="font-medium">Kg per roll</span> = Thickness x (Width / 1000) x Length x Specific Gravity</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
