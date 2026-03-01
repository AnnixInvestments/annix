"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type {
  CompanyType,
  RubberCompanyDto,
  RubberPricingTierDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "name" | "code" | "pricingTier" | "isCompoundOwner" | "products";

interface CompanyTableProps {
  companies: RubberCompanyDto[];
  isLoading: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onEdit: (company: RubberCompanyDto) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  emptyTitle: string;
  emptySubtitle: string;
  showPricingTier?: boolean;
}

function CompanyTable({
  companies,
  isLoading,
  sortColumn,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onAdd,
  emptyTitle,
  emptySubtitle,
  showPricingTier = true,
}: CompanyTableProps) {
  if (isLoading) {
    return <TableLoadingState message="Loading companies..." />;
  }

  if (companies.length === 0) {
    return (
      <TableEmptyState
        icon={<TableIcons.building />}
        title={emptyTitle}
        subtitle={emptySubtitle}
        action={{ label: "Add Company", onClick: onAdd }}
      />
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort("name")}
          >
            Name
            <SortIcon active={sortColumn === "name"} direction={sortDirection} />
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort("code")}
          >
            Code
            <SortIcon active={sortColumn === "code"} direction={sortDirection} />
          </th>
          {showPricingTier && (
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort("pricingTier")}
            >
              Pricing Tier
              <SortIcon active={sortColumn === "pricingTier"} direction={sortDirection} />
            </th>
          )}
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort("isCompoundOwner")}
          >
            Compound Owner
            <SortIcon active={sortColumn === "isCompoundOwner"} direction={sortDirection} />
          </th>
          <th
            scope="col"
            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort("products")}
          >
            Products
            <SortIcon active={sortColumn === "products"} direction={sortDirection} />
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
              <span className="text-sm font-medium text-gray-900">{company.name}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {company.code || "-"}
            </td>
            {showPricingTier && (
              <td className="px-6 py-4 whitespace-nowrap">
                {company.pricingTierName ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {company.pricingTierName} ({company.pricingFactor}%)
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </td>
            )}
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
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.availableProducts.length > 0 ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-500"}`}
              >
                {company.availableProducts.length}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button
                onClick={() => onEdit(company)}
                className="text-yellow-600 hover:text-yellow-900"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(company.id)}
                className="text-red-600 hover:text-red-900 ml-4"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AuRubberCompaniesPage() {
  const { showToast } = useToast();

  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [pricingTiers, setPricingTiers] = useState<RubberPricingTierDto[]>([]);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<RubberCompanyDto | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    companyType: "CUSTOMER" as CompanyType,
    code: "",
    pricingTierId: null as number | null,
    vatNumber: "",
    registrationNumber: "",
    isCompoundOwner: false,
    notes: "",
    address: { street: "", city: "", province: "", postalCode: "" },
    availableProducts: [] as string[],
  });

  const [customerSortColumn, setCustomerSortColumn] = useState<SortColumn>("name");
  const [customerSortDirection, setCustomerSortDirection] = useState<SortDirection>("asc");
  const [supplierSortColumn, setSupplierSortColumn] = useState<SortColumn>("name");
  const [supplierSortDirection, setSupplierSortDirection] = useState<SortDirection>("asc");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesData, tiersData, productsData] = await Promise.all([
        auRubberApiClient.companies(),
        auRubberApiClient.pricingTiers(),
        auRubberApiClient.products(),
      ]);
      setCompanies(companiesData);
      setPricingTiers(tiersData);
      setProducts(productsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortCompanies = (
    companiesToSort: RubberCompanyDto[],
    sortColumn: SortColumn,
    sortDirection: SortDirection,
  ): RubberCompanyDto[] => {
    return [...companiesToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "name") return direction * a.name.localeCompare(b.name);
      if (sortColumn === "code") return direction * (a.code || "").localeCompare(b.code || "");
      if (sortColumn === "pricingTier")
        return direction * (a.pricingTierName || "").localeCompare(b.pricingTierName || "");
      if (sortColumn === "isCompoundOwner")
        return direction * (Number(a.isCompoundOwner) - Number(b.isCompoundOwner));
      if (sortColumn === "products")
        return direction * (a.availableProducts.length - b.availableProducts.length);
      return 0;
    });
  };

  const handleCustomerSort = (column: SortColumn) => {
    if (customerSortColumn === column) {
      setCustomerSortDirection(customerSortDirection === "asc" ? "desc" : "asc");
    } else {
      setCustomerSortColumn(column);
      setCustomerSortDirection("asc");
    }
  };

  const handleSupplierSort = (column: SortColumn) => {
    if (supplierSortColumn === column) {
      setSupplierSortDirection(supplierSortDirection === "asc" ? "desc" : "asc");
    } else {
      setSupplierSortColumn(column);
      setSupplierSortDirection("asc");
    }
  };

  const customers = sortCompanies(
    companies.filter((c) => c.companyType === "CUSTOMER"),
    customerSortColumn,
    customerSortDirection,
  );

  const suppliers = sortCompanies(
    companies.filter((c) => c.companyType === "SUPPLIER"),
    supplierSortColumn,
    supplierSortDirection,
  );

  const openNewModal = (type: CompanyType) => {
    setEditingCompany(null);
    setFormData({
      name: "",
      companyType: type,
      code: "",
      pricingTierId: null,
      vatNumber: "",
      registrationNumber: "",
      isCompoundOwner: false,
      notes: "",
      address: { street: "", city: "", province: "", postalCode: "" },
      availableProducts: [],
    });
    setShowModal(true);
  };

  const openEditModal = (company: RubberCompanyDto) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      companyType: company.companyType,
      code: company.code || "",
      pricingTierId: company.pricingTierId || null,
      vatNumber: company.vatNumber || "",
      registrationNumber: company.registrationNumber || "",
      isCompoundOwner: company.isCompoundOwner,
      notes: company.notes || "",
      address: {
        street: company.address?.street || "",
        city: company.address?.city || "",
        province: company.address?.province || "",
        postalCode: company.address?.postalCode || "",
      },
      availableProducts: company.availableProducts || [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const addressEntries = Object.entries(formData.address).filter(([, v]) => v.trim() !== "");
      const cleanedAddress =
        addressEntries.length > 0 ? Object.fromEntries(addressEntries) : undefined;
      const payload = {
        ...formData,
        companyType: formData.companyType,
        pricingTierId: formData.pricingTierId ?? undefined,
        address: cleanedAddress,
      };
      if (editingCompany) {
        await auRubberApiClient.updateCompany(editingCompany.id, payload);
      } else {
        await auRubberApiClient.createCompany(payload);
      }
      showToast(editingCompany ? "Company updated" : "Company created", "success");
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save company", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteCompany(id);
      showToast("Company deleted", "success");
      setDeleteCompanyId(null);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete company", "error");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Companies</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Companies" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Companies</h1>
        <p className="mt-1 text-sm text-gray-600">Manage customers and suppliers</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
            Customers
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
              {customers.length}
            </span>
          </h2>
          <button
            onClick={() => openNewModal("CUSTOMER")}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Customer
          </button>
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <CompanyTable
            companies={customers}
            isLoading={isLoading}
            sortColumn={customerSortColumn}
            sortDirection={customerSortDirection}
            onSort={handleCustomerSort}
            onEdit={openEditModal}
            onDelete={setDeleteCompanyId}
            onAdd={() => openNewModal("CUSTOMER")}
            emptyTitle="No customers yet"
            emptySubtitle="Add your first customer to get started"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-2" />
            Suppliers
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
              {suppliers.length}
            </span>
          </h2>
          <button
            onClick={() => openNewModal("SUPPLIER")}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Supplier
          </button>
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <CompanyTable
            companies={suppliers}
            isLoading={isLoading}
            sortColumn={supplierSortColumn}
            sortDirection={supplierSortDirection}
            onSort={handleSupplierSort}
            onEdit={openEditModal}
            onDelete={setDeleteCompanyId}
            onAdd={() => openNewModal("SUPPLIER")}
            emptyTitle="No suppliers yet"
            emptySubtitle="Add your first supplier to get started"
            showPricingTier={false}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCompany
                  ? `Edit ${formData.companyType === "CUSTOMER" ? "Customer" : "Supplier"}`
                  : `Add ${formData.companyType === "CUSTOMER" ? "Customer" : "Supplier"}`}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
                <div
                  className={formData.companyType === "CUSTOMER" ? "grid grid-cols-2 gap-4" : ""}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                  {formData.companyType === "CUSTOMER" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pricing Tier
                      </label>
                      <select
                        value={formData.pricingTierId ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricingTierId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        <option value="">Select tier</option>
                        {pricingTiers.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.name} ({tier.pricingFactor}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">VAT Number</label>
                    <input
                      type="text"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, registrationNumber: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
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
                        <label
                          key={product.firebaseUid}
                          className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.availableProducts.includes(product.firebaseUid)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...formData.availableProducts, product.firebaseUid]
                                : formData.availableProducts.filter(
                                    (uid) => uid !== product.firebaseUid,
                                  );
                              setFormData({ ...formData, availableProducts: updated });
                            }}
                            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">
                            {product.title || "Untitled"}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isCompoundOwner}
                    onChange={(e) =>
                      setFormData({ ...formData, isCompoundOwner: e.target.checked })
                    }
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Compound Owner</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
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
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                    formData.companyType === "CUSTOMER"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {isSaving ? "Saving..." : "Save"}
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
    </div>
  );
}
