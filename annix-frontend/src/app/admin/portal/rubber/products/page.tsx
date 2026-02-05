'use client';

import React, { useState, useEffect } from 'react';
import { rubberPortalApi, RubberProductDto } from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';

export default function RubberProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const productsData = await rubberPortalApi.products();
      setProducts(productsData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await rubberPortalApi.deleteProduct(id);
      showToast('Product deleted', 'success');
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      showToast(errorMessage, 'error');
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '-';
    return `R ${value.toFixed(2)}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Products</div>
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rubber Products</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage rubber lining products</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">Products will appear here after import.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type / Compound
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Properties
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/kg
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Markup
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price/kg
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sp. Gravity
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.title || 'Untitled'}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.typeName || '-'}</div>
                      <div className="text-sm text-gray-500">{product.compoundName || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.colourName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                            {product.colourName}
                          </span>
                        )}
                        {product.hardnessName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                            {product.hardnessName}
                          </span>
                        )}
                        {product.gradeName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                            {product.gradeName}
                          </span>
                        )}
                        {product.curingMethodName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                            {product.curingMethodName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(product.costPerKg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.markup ? `${product.markup}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(product.pricePerKg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.specificGravity?.toFixed(2) || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Pricing Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                <strong>Price per kg</strong> = Cost per kg × (Markup / 100)
              </p>
              <p className="mt-1">
                <strong>Sale price per kg</strong> = Price per kg × (Company Pricing Factor / 100)
              </p>
              <p className="mt-1">
                <strong>Kg per roll</strong> = Thickness × (Width / 1000) × Length × Specific Gravity
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
