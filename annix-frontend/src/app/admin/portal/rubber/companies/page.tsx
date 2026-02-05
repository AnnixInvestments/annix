'use client';

import React, { useState, useEffect } from 'react';
import { rubberPortalApi, RubberCompanyDto, RubberPricingTierDto } from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';

export default function RubberCompaniesPage() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [pricingTiers, setPricingTiers] = useState<RubberPricingTierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<RubberCompanyDto | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    pricingTierId: undefined as number | undefined,
    vatNumber: '',
    registrationNumber: '',
    isCompoundOwner: false,
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [companiesData, tiersData] = await Promise.all([
        rubberPortalApi.companies(),
        rubberPortalApi.pricingTiers(),
      ]);
      setCompanies(companiesData);
      setPricingTiers(tiersData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load companies';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      code: '',
      pricingTierId: undefined,
      vatNumber: '',
      registrationNumber: '',
      isCompoundOwner: false,
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (company: RubberCompanyDto) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      code: company.code || '',
      pricingTierId: company.pricingTierId || undefined,
      vatNumber: company.vatNumber || '',
      registrationNumber: company.registrationNumber || '',
      isCompoundOwner: company.isCompoundOwner,
      notes: company.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingCompany) {
        await rubberPortalApi.updateCompany(editingCompany.id, formData);
        showToast('Company updated', 'success');
      } else {
        await rubberPortalApi.createCompany(formData);
        showToast('Company created', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save company';
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
      await rubberPortalApi.deleteCompany(id);
      showToast('Company deleted', 'success');
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete company';
      showToast(errorMessage, 'error');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Companies</div>
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
          <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Companies</h1>
          <p className="mt-1 text-sm text-gray-600">Manage companies and their pricing tiers</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Company
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading companies...</p>
            </div>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first company.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing Tier
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compound Owner
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    {company.registrationNumber && (
                      <div className="text-sm text-gray-500">Reg: {company.registrationNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {company.pricingTierName ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {company.pricingTierName} ({company.pricingFactor}%)
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {company.vatNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {company.isCompoundOwner ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(company)} className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(company.id)} className="text-red-600 hover:text-red-900 ml-4">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="Company Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="ABC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pricing Tier</label>
                    <select
                      value={formData.pricingTierId ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricingTierId: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                      <option value="">Select tier</option>
                      {pricingTiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name} ({tier.pricingFactor}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">VAT Number</label>
                    <input
                      type="text"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="VAT123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="2020/123456/07"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isCompoundOwner}
                    onChange={(e) => setFormData({ ...formData, isCompoundOwner: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Compound Owner</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="Additional notes..."
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
                  disabled={isSaving || !formData.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
