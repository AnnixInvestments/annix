"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { RubberTaxInvoiceDto } from "@/app/lib/api/auRubberApi";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type {
  RubberCompanyDto,
  RubberOrderDto,
  RubberPricingTierDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";
import {
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../../components/TableComponents";

type SortColumn = "name" | "code" | "pricingTier" | "isCompoundOwner" | "products";

interface CustomerFormData {
  name: string;
  code: string;
  pricingTierId: number | null;
  vatNumber: string;
  registrationNumber: string;
  isCompoundOwner: boolean;
  notes: string;
  phone: string;
  contactPerson: string;
  address: { street: string; city: string; province: string; postalCode: string };
  availableProducts: string[];
  incomingPoEmail: string;
  outgoingCocEmail: string;
  outgoingCtiEmail: string;
  outgoingStatementEmail: string;
}

const EMPTY_FORM: CustomerFormData = {
  name: "",
  code: "",
  pricingTierId: null,
  vatNumber: "",
  registrationNumber: "",
  isCompoundOwner: false,
  notes: "",
  phone: "",
  contactPerson: "",
  address: { street: "", city: "", province: "", postalCode: "" },
  availableProducts: [],
  incomingPoEmail: "",
  outgoingCocEmail: "",
  outgoingCtiEmail: "",
  outgoingStatementEmail: "",
};

function formFromCompany(company: RubberCompanyDto): CustomerFormData {
  return {
    name: company.name,
    code: company.code || "",
    pricingTierId: company.pricingTierId || null,
    vatNumber: company.vatNumber || "",
    registrationNumber: company.registrationNumber || "",
    isCompoundOwner: company.isCompoundOwner,
    notes: company.notes || "",
    phone: company.phone || "",
    contactPerson: company.contactPerson || "",
    address: {
      street: company.address?.street || "",
      city: company.address?.city || "",
      province: company.address?.province || "",
      postalCode: company.address?.postalCode || "",
    },
    availableProducts: company.availableProducts || [],
    incomingPoEmail: company.emailConfig?.incomingPoEmail || "",
    outgoingCocEmail: company.emailConfig?.outgoingCocEmail || "",
    outgoingCtiEmail: company.emailConfig?.outgoingCtiEmail || "",
    outgoingStatementEmail: company.emailConfig?.outgoingStatementEmail || "",
  };
}

function CustomerDetailForm(props: {
  formData: CustomerFormData;
  pricingTiers: RubberPricingTierDto[];
  products: RubberProductDto[];
  isSaving: boolean;
  isEditing: boolean;
  onFormChange: (data: CustomerFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { formData, pricingTiers, products, isSaving, isEditing, onFormChange, onSave, onCancel } =
    props;

  const inputClass =
    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? `Edit Customer: ${formData.name}` : "Add New Customer"}
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !formData.name}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
              Company Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Company Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => onFormChange({ ...formData, code: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Pricing Tier</label>
                  <select
                    value={formData.pricingTierId || ""}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        pricingTierId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className={inputClass}
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
                  <label className={labelClass}>Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => onFormChange({ ...formData, contactPerson: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => onFormChange({ ...formData, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>VAT Number</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => onFormChange({ ...formData, vatNumber: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Registration Number</label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) =>
                      onFormChange({ ...formData, registrationNumber: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isCompoundOwner}
                  onChange={(e) => onFormChange({ ...formData, isCompoundOwner: e.target.checked })}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Compound Owner</label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
              Address
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Street</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <input
                    type="text"
                    value={formData.address.province}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        address: { ...formData.address, province: e.target.value },
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        address: { ...formData.address, postalCode: e.target.value },
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
              Email Configuration
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Configure email addresses for document routing with this customer.
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Incoming PO Email</label>
                <input
                  type="email"
                  value={formData.incomingPoEmail}
                  onChange={(e) => onFormChange({ ...formData, incomingPoEmail: e.target.value })}
                  placeholder="e.g. purchasing@customer.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Email address that purchase orders are normally received from
                </p>
              </div>
              <div>
                <label className={labelClass}>Outgoing COC Email</label>
                <input
                  type="email"
                  value={formData.outgoingCocEmail}
                  onChange={(e) => onFormChange({ ...formData, outgoingCocEmail: e.target.value })}
                  placeholder="e.g. quality@customer.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Email address to send Certificates of Conformance to
                </p>
              </div>
              <div>
                <label className={labelClass}>Outgoing CTI Email</label>
                <input
                  type="email"
                  value={formData.outgoingCtiEmail}
                  onChange={(e) => onFormChange({ ...formData, outgoingCtiEmail: e.target.value })}
                  placeholder="e.g. quality@customer.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">Email address to send CTI documents to</p>
              </div>
              <div>
                <label className={labelClass}>Outgoing Statements Email</label>
                <input
                  type="email"
                  value={formData.outgoingStatementEmail}
                  onChange={(e) =>
                    onFormChange({ ...formData, outgoingStatementEmail: e.target.value })
                  }
                  placeholder="e.g. accounts@customer.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">Email address to send statements to</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
              Available Products ({formData.availableProducts.length} selected)
            </h3>
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
                          : formData.availableProducts.filter((uid) => uid !== product.firebaseUid);
                        onFormChange({ ...formData, availableProducts: updated });
                      }}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900">{product.title || "Untitled"}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">
              Notes
            </h3>
            <textarea
              value={formData.notes}
              onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
              rows={4}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyActivity(props: { companyId: number }) {
  const { companyId } = props;
  const [orders, setOrders] = useState<RubberOrderDto[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<RubberTaxInvoiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setIsLoading(true);
        const [ordersData, tiData] = await Promise.all([
          auRubberApiClient.orders(),
          auRubberApiClient.taxInvoices({ companyId, invoiceType: "CUSTOMER" }),
        ]);
        setOrders(ordersData.filter((o) => o.companyId === companyId));
        setTaxInvoices(tiData);
      } catch {
        // Activity is supplementary
      } finally {
        setIsLoading(false);
      }
    };
    loadActivity();
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
        <p className="text-sm text-gray-500">Loading activity...</p>
      </div>
    );
  }

  const hasActivity = orders.length > 0 || taxInvoices.length > 0;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
      {!hasActivity ? (
        <p className="text-sm text-gray-500">No activity found for this customer</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">
              Orders ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/au-rubber/portal/orders/${order.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                      <span
                        className={`px-2 text-xs font-semibold rounded-full ${
                          order.status >= 5
                            ? "bg-green-100 text-green-800"
                            : order.status >= 3
                              ? "bg-blue-100 text-blue-800"
                              : order.status === 1
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {order.companyOrderNumber || "No PO ref"}
                      </span>
                      <span className="text-xs text-gray-500">{order.items.length} items</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">
              Tax Invoices ({taxInvoices.length})
            </h3>
            {taxInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">No tax invoices</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {taxInvoices.map((ti) => (
                  <Link
                    key={ti.id}
                    href={`/au-rubber/portal/tax-invoices/${ti.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{ti.invoiceNumber}</span>
                      <span
                        className={`px-2 text-xs font-semibold rounded-full ${
                          ti.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : ti.status === "EXTRACTED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {ti.statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{ti.invoiceDate || "No date"}</span>
                      {ti.totalAmount !== null && (
                        <span className="text-xs font-medium text-gray-700">
                          R{" "}
                          {Number(ti.totalAmount).toLocaleString("en-ZA", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<RubberCompanyDto[]>([]);
  const [pricingTiers, setPricingTiers] = useState<RubberPricingTierDto[]>([]);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [activeView, setActiveView] = useState<"list" | "detail">("list");
  const [editingCompany, setEditingCompany] = useState<RubberCompanyDto | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM);

  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesData, tiersData, productsData] = await Promise.all([
        auRubberApiClient.companies(),
        auRubberApiClient.pricingTiers(),
        auRubberApiClient.products(),
      ]);
      setCustomers(companiesData.filter((c) => c.companyType === "CUSTOMER"));
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

  const sortedCustomers = [...customers].sort((a, b) => {
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const openNewForm = () => {
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setActiveView("detail");
  };

  const openEditForm = (company: RubberCompanyDto) => {
    setEditingCompany(company);
    setFormData(formFromCompany(company));
    setActiveView("detail");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const addressEntries = Object.entries(formData.address).filter(([, v]) => v.trim() !== "");
      const cleanedAddress = addressEntries.length > 0 ? Object.fromEntries(addressEntries) : null;

      const emailConfig: Record<string, string> = {};
      if (formData.incomingPoEmail.trim())
        emailConfig.incomingPoEmail = formData.incomingPoEmail.trim();
      if (formData.outgoingCocEmail.trim())
        emailConfig.outgoingCocEmail = formData.outgoingCocEmail.trim();
      if (formData.outgoingCtiEmail.trim())
        emailConfig.outgoingCtiEmail = formData.outgoingCtiEmail.trim();
      if (formData.outgoingStatementEmail.trim())
        emailConfig.outgoingStatementEmail = formData.outgoingStatementEmail.trim();

      const payload = {
        name: formData.name,
        companyType: "CUSTOMER" as const,
        code: formData.code || null,
        pricingTierId: formData.pricingTierId || null,
        vatNumber: formData.vatNumber || null,
        registrationNumber: formData.registrationNumber || null,
        isCompoundOwner: formData.isCompoundOwner,
        notes: formData.notes || null,
        phone: formData.phone || null,
        contactPerson: formData.contactPerson || null,
        address: cleanedAddress,
        availableProducts: formData.availableProducts,
        emailConfig: Object.keys(emailConfig).length > 0 ? emailConfig : null,
      };

      if (editingCompany) {
        await auRubberApiClient.updateCompany(editingCompany.id, payload);
      } else {
        await auRubberApiClient.createCompany(payload);
      }
      showToast(editingCompany ? "Customer updated" : "Customer created", "success");
      setActiveView("list");
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save customer", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteCompany(id);
      showToast("Customer deleted", "success");
      setDeleteCompanyId(null);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete customer", "error");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Customers</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (activeView === "detail") {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Companies" },
            { label: "Customers", href: "/au-rubber/portal/companies/customers" },
            { label: editingCompany ? editingCompany.name : "New Customer" },
          ]}
        />
        <CustomerDetailForm
          formData={formData}
          pricingTiers={pricingTiers}
          products={products}
          isSaving={isSaving}
          isEditing={editingCompany !== null}
          onFormChange={setFormData}
          onSave={handleSave}
          onCancel={() => setActiveView("list")}
        />
        {editingCompany && <CompanyActivity companyId={editingCompany.id} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Companies" }, { label: "Customers" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
            Customers
            <span className="ml-3 px-2.5 py-0.5 rounded-full text-sm bg-blue-100 text-blue-700">
              {customers.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage customer companies, email configuration, pricing tiers, and product access
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading customers..." />
        ) : customers.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.building />}
            title="No customers yet"
            subtitle="Add your first customer to get started"
            action={{ label: "Add Customer", onClick: openNewForm }}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("name")}
                >
                  Name
                  <SortIcon active={sortColumn === "name"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("code")}
                >
                  Code
                  <SortIcon active={sortColumn === "code"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("pricingTier")}
                >
                  Pricing Tier
                  <SortIcon active={sortColumn === "pricingTier"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contact
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Email Config
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("products")}
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
              {sortedCustomers.map((customer) => {
                const emailCount = Object.keys(customer.emailConfig || {}).length;
                return (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                        {customer.contactPerson && (
                          <p className="text-xs text-gray-500">{customer.contactPerson}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.code || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.pricingTierName ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {customer.pricingTierName} ({customer.pricingFactor}%)
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{customer.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emailCount > 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {emailCount} configured
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.availableProducts.length > 0 ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-500"}`}
                      >
                        {customer.availableProducts.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditForm(customer)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteCompanyId(customer.id)}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteCompanyId !== null}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteCompanyId && handleDelete(deleteCompanyId)}
        onCancel={() => setDeleteCompanyId(null)}
      />
    </div>
  );
}
