'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { rubberPortalApi, RubberCompanyDto, RubberPricingTierDto, RubberProductDto } from '@/app/lib/api/rubberPortalApi';
import { useToast } from '@/app/components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { Breadcrumb } from '../components/Breadcrumb';
import { SortIcon, SortDirection, TableLoadingState, TableEmptyState, Pagination, TableIcons, ITEMS_PER_PAGE } from '../components/TableComponents';

type SortColumn = 'name' | 'code' | 'pricingTier' | 'vatNumber' | 'isCompoundOwner' | 'products';

export default function RubberCompaniesPage() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [pricingTiers, setPricingTiers] = useState<RubberPricingTierDto[]>([]);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<RubberCompanyDto | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    pricingTierId: undefined as number | undefined,
    vatNumber: '',
    registrationNumber: '',
    isCompoundOwner: false,
    notes: '',
    address: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
    },
    availableProducts: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const sortCompanies = (companiesToSort: RubberCompanyDto[]): RubberCompanyDto[] => {
    return [...companiesToSort].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortColumn === 'name') {
        return direction * a.name.localeCompare(b.name);
      } else if (sortColumn === 'code') {
        const aVal = a.code || '';
        const bVal = b.code || '';
        return direction * aVal.localeCompare(bVal);
      } else if (sortColumn === 'pricingTier') {
        const aVal = a.pricingTierName || '';
        const bVal = b.pricingTierName || '';
        return direction * aVal.localeCompare(bVal);
      } else if (sortColumn === 'vatNumber') {
        const aVal = a.vatNumber || '';
        const bVal = b.vatNumber || '';
        return direction * aVal.localeCompare(bVal);
      } else if (sortColumn === 'isCompoundOwner') {
        return direction * (Number(a.isCompoundOwner) - Number(b.isCompoundOwner));
      } else if (sortColumn === 'products') {
        return direction * (a.availableProducts.length - b.availableProducts.length);
      }
      return 0;
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleSelectCompany = (companyId: number) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedCompanies(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCompanies.size === paginatedCompanies.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(paginatedCompanies.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    setShowBulkDeleteModal(false);
    const ids = Array.from(selectedCompanies);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        await rubberPortalApi.deleteCompany(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      showToast(`Deleted ${successCount} compan${successCount > 1 ? 'ies' : 'y'}${failCount > 0 ? `, ${failCount} failed` : ''}`, failCount > 0 ? 'warning' : 'success');
      setSelectedCompanies(new Set());
      fetchData();
    } else if (failCount > 0) {
      showToast(`Failed to delete ${failCount} compan${failCount > 1 ? 'ies' : 'y'}`, 'error');
    }
  };

  const filteredCompanies = sortCompanies(companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.code && company.code.toLowerCase().includes(searchQuery.toLowerCase()))
  ));

  const paginatedCompanies = filteredCompanies.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(0);
    setSelectedCompanies(new Set());
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [companiesData, tiersData, productsData] = await Promise.all([
        rubberPortalApi.companies(),
        rubberPortalApi.pricingTiers(),
        rubberPortalApi.products(),
      ]);
      setCompanies(companiesData);
      setPricingTiers(tiersData);
      setProducts(productsData);
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
      address: {
        street: '',
        city: '',
        province: '',
        postalCode: '',
      },
      availableProducts: [],
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
      address: {
        street: company.address?.street || '',
        city: company.address?.city || '',
        province: company.address?.province || '',
        postalCode: company.address?.postalCode || '',
      },
      availableProducts: company.availableProducts || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const addressEntries = Object.entries(formData.address).filter(([, v]) => v.trim() !== '');
      const cleanedAddress = addressEntries.length > 0 ? Object.fromEntries(addressEntries) : undefined;
      const payload = { ...formData, address: cleanedAddress };
      if (editingCompany) {
        await rubberPortalApi.updateCompany(editingCompany.id, payload);
        showToast('Company updated', 'success');
      } else {
        await rubberPortalApi.createCompany(payload);
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
    try {
      await rubberPortalApi.deleteCompany(id);
      showToast('Company deleted', 'success');
      setDeleteCompanyId(null);
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
      <Breadcrumb items={[{ label: 'Companies' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Companies</h1>
          <p className="mt-1 text-sm text-gray-600">Manage companies and their pricing tiers</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedCompanies.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedCompanies.size})
            </button>
          )}
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
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or code..."
            className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading companies..." />
        ) : filteredCompanies.length === 0 ? (
          <TableEmptyState
            icon={TableIcons.building}
            title="No companies found"
            subtitle={searchQuery ? 'Try adjusting your search' : 'Get started by adding your first company.'}
            action={!searchQuery ? { label: 'Add Company', onClick: openNewModal } : undefined}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={paginatedCompanies.length > 0 && selectedCompanies.size === paginatedCompanies.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <SortIcon active={sortColumn === 'name'} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('code')}
                >
                  Code
                  <SortIcon active={sortColumn === 'code'} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pricingTier')}
                >
                  Pricing Tier
                  <SortIcon active={sortColumn === 'pricingTier'} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('vatNumber')}
                >
                  VAT Number
                  <SortIcon active={sortColumn === 'vatNumber'} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('isCompoundOwner')}
                >
                  Compound Owner
                  <SortIcon active={sortColumn === 'isCompoundOwner'} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('products')}
                >
                  Products
                  <SortIcon active={sortColumn === 'products'} direction={sortDirection} />
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCompanies.map((company) => (
                <tr key={company.id} className={`hover:bg-gray-50 ${selectedCompanies.has(company.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.has(company.id)}
                      onChange={() => toggleSelectCompany(company.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.availableProducts.length > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
                      {company.availableProducts.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(company)} className="text-blue-600 hover:text-blue-900">
                      Edit
                    </button>
                    <button onClick={() => setDeleteCompanyId(company.id)} className="text-red-600 hover:text-red-900 ml-4">
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
          totalItems={filteredCompanies.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="companies"
          onPageChange={setCurrentPage}
        />
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
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      placeholder="Street Address"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={formData.address.province}
                        onChange={(e) => setFormData({ ...formData, address: { ...formData.address, province: e.target.value } })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        placeholder="Province"
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.address.postalCode}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postalCode: e.target.value } })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 w-32"
                      placeholder="Postal Code"
                    />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Products ({formData.availableProducts.length} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                    {products.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No products available</p>
                    ) : (
                      products.map((product) => (
                        <label key={product.firebaseUid} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.availableProducts.includes(product.firebaseUid)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...formData.availableProducts, product.firebaseUid]
                                : formData.availableProducts.filter((uid) => uid !== product.firebaseUid);
                              setFormData({ ...formData, availableProducts: updated });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">{product.title || 'Untitled'}</span>
                          {product.typeName && (
                            <span className="text-xs text-gray-500">({product.typeName})</span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Select products that should be available to this company
                  </p>
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

      <ConfirmModal
        isOpen={deleteCompanyId !== null}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteCompanyId && handleDelete(deleteCompanyId)}
        onCancel={() => setDeleteCompanyId(null)}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Delete Selected Companies"
        message={`Are you sure you want to delete ${selectedCompanies.size} compan${selectedCompanies.size > 1 ? 'ies' : 'y'}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedCompanies.size}`}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />
    </div>
  );
}
