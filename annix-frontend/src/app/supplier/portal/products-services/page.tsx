'use client';

import React, { useState, useEffect } from 'react';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';
import { supplierPortalApi } from '@/app/lib/api/supplierApi';
import { PRODUCTS_AND_SERVICES } from '@/app/lib/config/productsServices';
import { corpId } from '@/app/lib/corpId';
import { log } from '@/app/lib/logger';

export default function ProductsServicesPage() {
  const { supplier } = useSupplierAuth();
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadCapabilities() {
      try {
        const data = await supplierPortalApi.getCapabilities();
        setSelectedCapabilities(data.capabilities || []);
      } catch (error) {
        log.error('Failed to load capabilities:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCapabilities();
  }, []);

  const toggleCapability = (value: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSave = async () => {
    if (selectedCapabilities.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one product or service.' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      await supplierPortalApi.saveCapabilities(selectedCapabilities);
      setMessage({ type: 'success', text: 'Your products and services have been saved successfully.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const products = PRODUCTS_AND_SERVICES.filter(item => item.category === 'product');
  const services = PRODUCTS_AND_SERVICES.filter(item => item.category === 'service');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Products & Services
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Select the products and services your company can offer. This helps us match you with relevant RFQ opportunities.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {message && (
            <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
              {message.text}
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleCapability(item.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCapabilities.includes(item.value)
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{item.description}</div>
                    </div>
                    {selectedCapabilities.includes(item.value) && (
                      <svg className="w-6 h-6 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleCapability(item.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCapabilities.includes(item.value)
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{item.description}</div>
                    </div>
                    {selectedCapabilities.includes(item.value) && (
                      <svg className="w-6 h-6 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-md font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: corpId.colors.accent.orange }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
