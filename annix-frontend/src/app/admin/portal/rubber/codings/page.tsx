'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { rubberPortalApi, RubberProductCodingDto } from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';
import { CodingType, CODING_TYPES } from '@/app/lib/config/rubber/codingTypes';
import { ConfirmModal } from '../components/ConfirmModal';
import { Breadcrumb } from '../components/Breadcrumb';
import { TableLoadingState, Pagination, ITEMS_PER_PAGE } from '../components/TableComponents';

export default function RubberCodingsPage() {
  const { showToast } = useToast();
  const [codings, setCodings] = useState<RubberProductCodingDto[]>([]);
  const [selectedType, setSelectedType] = useState<CodingType>('COMPOUND');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCoding, setEditingCoding] = useState<RubberProductCodingDto | null>(null);
  const [deleteCodingId, setDeleteCodingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codingType: 'COMPOUND' as CodingType,
    code: '',
    name: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const paginatedCodings = codings.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const fetchData = async (type: CodingType) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await rubberPortalApi.productCodings(type);
      setCodings(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load codings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedType);
  }, [selectedType]);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedType]);

  const openNewModal = () => {
    setEditingCoding(null);
    setFormData({
      codingType: selectedType,
      code: '',
      name: '',
    });
    setShowModal(true);
  };

  const openEditModal = (coding: RubberProductCodingDto) => {
    setEditingCoding(coding);
    setFormData({
      codingType: coding.codingType,
      code: coding.code,
      name: coding.name,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingCoding) {
        await rubberPortalApi.updateProductCoding(editingCoding.id, {
          code: formData.code,
          name: formData.name,
        });
        showToast('Coding updated', 'success');
      } else {
        await rubberPortalApi.createProductCoding(formData);
        showToast('Coding created', 'success');
      }
      setShowModal(false);
      fetchData(selectedType);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save coding';
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await rubberPortalApi.deleteProductCoding(id);
      showToast('Coding deleted', 'success');
      setDeleteCodingId(null);
      fetchData(selectedType);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete coding';
      showToast(errorMessage, 'error');
    }
  };

  const currentTypeInfo = CODING_TYPES.find((t) => t.value === selectedType);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Codings</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => fetchData(selectedType)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Product Codings' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Codings</h1>
          <p className="mt-1 text-sm text-gray-600">Manage product attribute codes</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add {currentTypeInfo?.label.slice(0, -1) || 'Coding'}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {CODING_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                selectedType === type.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </nav>
      </div>

      {currentTypeInfo && (
        <p className="text-sm text-gray-500">{currentTypeInfo.description}</p>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message={`Loading ${currentTypeInfo?.label.toLowerCase()}...`} />
        ) : codings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No {currentTypeInfo?.label.toLowerCase()} found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first {currentTypeInfo?.label.slice(0, -1).toLowerCase()}.</p>
            <button
              onClick={openNewModal}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add {currentTypeInfo?.label.slice(0, -1) || 'Coding'}
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCodings.map((coding) => (
                <tr key={coding.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {coding.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{coding.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(coding)} className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                    <button onClick={() => setDeleteCodingId(coding.id)} className="text-red-600 hover:text-red-900 ml-4">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <Pagination
          currentPage={currentPage}
          totalItems={codings.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName={currentTypeInfo?.label.toLowerCase() ?? 'codings'}
          onPageChange={setCurrentPage}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCoding ? 'Edit' : 'Add'} {currentTypeInfo?.label.slice(0, -1)}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="e.g. NR, SBR, RED"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="e.g. Natural Rubber, Red"
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.code || !formData.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteCodingId !== null}
        title="Delete Coding"
        message="Are you sure you want to delete this coding? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteCodingId && handleDelete(deleteCodingId)}
        onCancel={() => setDeleteCodingId(null)}
      />
    </div>
  );
}
