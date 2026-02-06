'use client';

import React, { useState, useEffect } from 'react';
import {
  rubberPortalApi,
  RubberProductDto,
  RubberProductCodingDto,
  RubberCompanyDto,
  CreateRubberProductDto,
} from '@/app/lib/api/rubberPortalApi';
import { log } from '@/app/lib/logger';

interface ProductFormModalProps {
  isOpen: boolean;
  product: RubberProductDto | null;
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
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
  markup: string;
}

const INITIAL_FORM_DATA: FormData = {
  title: '',
  description: '',
  specificGravity: '',
  compoundOwnerFirebaseUid: '',
  compoundFirebaseUid: '',
  typeFirebaseUid: '',
  costPerKg: '',
  colourFirebaseUid: '',
  hardnessFirebaseUid: '',
  curingMethodFirebaseUid: '',
  gradeFirebaseUid: '',
  markup: '',
};

export function ProductFormModal({ isOpen, product, onSave, onCancel }: ProductFormModalProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [codings, setCodings] = useState<RubberProductCodingDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const isEditing = product !== null;

  useEffect(() => {
    if (isOpen) {
      loadReferenceData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        specificGravity: product.specificGravity?.toString() || '',
        compoundOwnerFirebaseUid: product.compoundOwnerFirebaseUid || '',
        compoundFirebaseUid: product.compoundFirebaseUid || '',
        typeFirebaseUid: product.typeFirebaseUid || '',
        costPerKg: product.costPerKg?.toString() || '',
        colourFirebaseUid: product.colourFirebaseUid || '',
        hardnessFirebaseUid: product.hardnessFirebaseUid || '',
        curingMethodFirebaseUid: product.curingMethodFirebaseUid || '',
        gradeFirebaseUid: product.gradeFirebaseUid || '',
        markup: product.markup?.toString() || '',
      });
    } else if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
    }
  }, [isOpen, product]);

  const loadReferenceData = async () => {
    try {
      setIsLoadingData(true);
      const [codingsData, companiesData] = await Promise.all([
        rubberPortalApi.productCodings(),
        rubberPortalApi.companies(),
      ]);
      setCodings(codingsData);
      setCompanies(companiesData.filter((c) => c.isCompoundOwner));
    } catch (err) {
      log.error('Failed to load reference data:', err);
      setError('Failed to load form data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const codingsByType = (type: string) => codings.filter((c) => c.codingType === type);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const dto: CreateRubberProductDto = {
        title: formData.title.trim() || undefined,
        description: formData.description.trim() || undefined,
        specificGravity: formData.specificGravity ? parseFloat(formData.specificGravity) : undefined,
        compoundOwnerFirebaseUid: formData.compoundOwnerFirebaseUid || undefined,
        compoundFirebaseUid: formData.compoundFirebaseUid || undefined,
        typeFirebaseUid: formData.typeFirebaseUid || undefined,
        costPerKg: formData.costPerKg ? parseFloat(formData.costPerKg) : undefined,
        colourFirebaseUid: formData.colourFirebaseUid || undefined,
        hardnessFirebaseUid: formData.hardnessFirebaseUid || undefined,
        curingMethodFirebaseUid: formData.curingMethodFirebaseUid || undefined,
        gradeFirebaseUid: formData.gradeFirebaseUid || undefined,
        markup: formData.markup ? parseFloat(formData.markup) : undefined,
      };

      if (isEditing && product) {
        await rubberPortalApi.updateProduct(product.id, dto);
      } else {
        await rubberPortalApi.createProduct(dto);
      }

      onSave();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save product';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedPrice = () => {
    const cost = parseFloat(formData.costPerKg) || 0;
    const markupPercent = parseFloat(formData.markup) || 100;
    return cost * (markupPercent / 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Product' : 'Create New Product'}
          </h2>
        </div>

        {isLoadingData ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product title"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.typeFirebaseUid}
                    onChange={(e) => handleChange('typeFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select type...</option>
                    {codingsByType('TYPE').map((c) => (
                      <option key={c.id} value={c.firebaseUid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compound</label>
                  <select
                    value={formData.compoundFirebaseUid}
                    onChange={(e) => handleChange('compoundFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select compound...</option>
                    {codingsByType('COMPOUND').map((c) => (
                      <option key={c.id} value={c.firebaseUid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
                  <select
                    value={formData.colourFirebaseUid}
                    onChange={(e) => handleChange('colourFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select colour...</option>
                    {codingsByType('COLOUR').map((c) => (
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
                    onChange={(e) => handleChange('hardnessFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select hardness...</option>
                    {codingsByType('HARDNESS').map((c) => (
                      <option key={c.id} value={c.firebaseUid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <select
                    value={formData.gradeFirebaseUid}
                    onChange={(e) => handleChange('gradeFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select grade...</option>
                    {codingsByType('GRADE').map((c) => (
                      <option key={c.id} value={c.firebaseUid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Curing Method</label>
                  <select
                    value={formData.curingMethodFirebaseUid}
                    onChange={(e) => handleChange('curingMethodFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select curing method...</option>
                    {codingsByType('CURING_METHOD').map((c) => (
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
                    onChange={(e) => handleChange('compoundOwnerFirebaseUid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                    onChange={(e) => handleChange('specificGravity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1.15"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost/kg (R)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPerKg}
                      onChange={(e) => handleChange('costPerKg', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.markup}
                      onChange={(e) => handleChange('markup', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSaving && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isEditing ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
