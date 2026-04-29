"use client";

import { toPairs as entries, keys } from "es-toolkit/compat";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import type { RubberDeliveryNoteDto, RubberTaxInvoiceDto } from "@/app/lib/api/auRubberApi";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";

type SortColumn = "name" | "code" | "contact" | "emailConfig" | "isCompoundOwner" | "products";

interface SupplierFormData {
  name: string;
  code: string;
  vatNumber: string;
  registrationNumber: string;
  isCompoundOwner: boolean;
  notes: string;
  phone: string;
  contactPerson: string;
  address: { street: string; city: string; province: string; postalCode: string };
  availableProducts: string[];
  cocFromEmail: string;
  stiFromEmail: string;
  purchaseOrderToEmail: string;
  statementEmail: string;
}

const EMPTY_FORM: SupplierFormData = {
  name: "",
  code: "",
  vatNumber: "",
  registrationNumber: "",
  isCompoundOwner: false,
  notes: "",
  phone: "",
  contactPerson: "",
  address: { street: "", city: "", province: "", postalCode: "" },
  availableProducts: [],
  cocFromEmail: "",
  stiFromEmail: "",
  purchaseOrderToEmail: "",
  statementEmail: "",
};

function formFromCompany(company: RubberCompanyDto): SupplierFormData {
  const rawCode = company.code;
  const rawVatNumber = company.vatNumber;
  const rawRegistrationNumber = company.registrationNumber;
  const rawNotes = company.notes;
  const rawPhone = company.phone;
  const rawContactPerson = company.contactPerson;
  const rawStreet = company.address?.street;
  const rawCity = company.address?.city;
  const rawProvince = company.address?.province;
  const rawPostalCode = company.address?.postalCode;
  const rawAvailableProducts = company.availableProducts;
  const rawCocFromEmail = company.emailConfig?.cocFromEmail;
  const rawStiFromEmail = company.emailConfig?.stiFromEmail;
  const rawPurchaseOrderToEmail = company.emailConfig?.purchaseOrderToEmail;
  const rawStatementEmail = company.emailConfig?.statementEmail;
  return {
    name: company.name,
    code: rawCode || "",
    vatNumber: rawVatNumber || "",
    registrationNumber: rawRegistrationNumber || "",
    isCompoundOwner: company.isCompoundOwner,
    notes: rawNotes || "",
    phone: rawPhone || "",
    contactPerson: rawContactPerson || "",
    address: {
      street: rawStreet || "",
      city: rawCity || "",
      province: rawProvince || "",
      postalCode: rawPostalCode || "",
    },
    availableProducts: rawAvailableProducts || [],
    cocFromEmail: rawCocFromEmail || "",
    stiFromEmail: rawStiFromEmail || "",
    purchaseOrderToEmail: rawPurchaseOrderToEmail || "",
    statementEmail: rawStatementEmail || "",
  };
}

function SupplierDetailForm(props: {
  formData: SupplierFormData;
  products: RubberProductDto[];
  isSaving: boolean;
  isEditing: boolean;
  onFormChange: (data: SupplierFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { formData, products, isSaving, isEditing, onFormChange, onSave, onCancel } = props;

  const inputClass =
    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? `Edit Supplier: ${formData.name}` : "Add New Supplier"}
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
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Supplier"}
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
                  <label className={labelClass}>Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => onFormChange({ ...formData, contactPerson: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => onFormChange({ ...formData, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>VAT Number</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => onFormChange({ ...formData, vatNumber: e.target.value })}
                    className={inputClass}
                  />
                </div>
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
              Configure email addresses for document routing. These help the system automatically
              allocate incoming documents to the correct pages, even if they sometimes arrive from
              different addresses.
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>COC Received From</label>
                <input
                  type="email"
                  value={formData.cocFromEmail}
                  onChange={(e) => onFormChange({ ...formData, cocFromEmail: e.target.value })}
                  placeholder="e.g. coc@example.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Email address that Certificates of Conformance are normally received from
                </p>
              </div>
              <div>
                <label className={labelClass}>STI Received From</label>
                <input
                  type="email"
                  value={formData.stiFromEmail}
                  onChange={(e) => onFormChange({ ...formData, stiFromEmail: e.target.value })}
                  placeholder="e.g. sti@example.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Email address that STI documents are normally received from
                </p>
              </div>
              <div>
                <label className={labelClass}>Send Purchase Orders To</label>
                <input
                  type="email"
                  value={formData.purchaseOrderToEmail}
                  onChange={(e) =>
                    onFormChange({ ...formData, purchaseOrderToEmail: e.target.value })
                  }
                  placeholder="e.g. orders@example.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Email address to send purchase orders to from the app
                </p>
              </div>
              <div>
                <label className={labelClass}>Outgoing Statements Email</label>
                <input
                  type="email"
                  value={formData.statementEmail}
                  onChange={(e) => onFormChange({ ...formData, statementEmail: e.target.value })}
                  placeholder="e.g. accounts@example.com"
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
                products.map((product) => {
                  const rawTitle = product.title;
                  return (
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
                          onFormChange({ ...formData, availableProducts: updated });
                        }}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900">{rawTitle || "Untitled"}</span>
                    </label>
                  );
                })
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
  const [taxInvoices, setTaxInvoices] = useState<RubberTaxInvoiceDto[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<RubberDeliveryNoteDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setIsLoading(true);
        const [tiData, dnData] = await Promise.all([
          auRubberApiClient.taxInvoices({
            companyId,
            invoiceType: "SUPPLIER",
            pageSize: 10000,
          }),
          auRubberApiClient.deliveryNotes({ supplierId: companyId, pageSize: 10000 }),
        ]);
        setTaxInvoices(tiData.items);
        setDeliveryNotes(dnData.items);
      } catch {
        setTaxInvoices([]);
        setDeliveryNotes([]);
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

  const hasActivity = taxInvoices.length > 0 || deliveryNotes.length > 0;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
      {!hasActivity ? (
        <p className="text-sm text-gray-500">No activity found for this supplier</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">
              Tax Invoices ({taxInvoices.length})
            </h3>
            {taxInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">No tax invoices</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {taxInvoices.map((ti) => {
                  const rawTiInvoiceDate = ti.invoiceDate;
                  return (
                    <Link
                      key={ti.id}
                      href={`/au-rubber/portal/tax-invoices/${ti.id}`}
                      className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {ti.invoiceNumber}
                        </span>
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
                        <span className="text-xs text-gray-500">
                          {rawTiInvoiceDate || "No date"}
                        </span>
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
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">
              Delivery Notes ({deliveryNotes.length})
            </h3>
            {deliveryNotes.length === 0 ? (
              <p className="text-sm text-gray-500">No delivery notes</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deliveryNotes.map((dn) => {
                  const rawDnNumber = dn.deliveryNoteNumber;
                  const rawDnDate = dn.deliveryDate;
                  return (
                    <Link
                      key={dn.id}
                      href={`/au-rubber/portal/delivery-notes/${dn.id}`}
                      className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {rawDnNumber || `DN-${dn.id}`}
                        </span>
                        <span
                          className={`px-2 text-xs font-semibold rounded-full ${
                            dn.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : dn.status === "EXTRACTED"
                                ? "bg-blue-100 text-blue-800"
                                : dn.status === "LINKED"
                                  ? "bg-purple-100 text-purple-800"
                                  : dn.status === "STOCK_CREATED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {dn.statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{rawDnDate || "No date"}</span>
                        <span className="text-xs text-gray-500">{dn.deliveryNoteTypeLabel}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<RubberCompanyDto[]>([]);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [activeView, setActiveView] = useState<"list" | "detail">("list");
  const [editingCompany, setEditingCompany] = useState<RubberCompanyDto | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(EMPTY_FORM);

  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [companiesData, productsData] = await Promise.all([
        auRubberApiClient.companies(),
        auRubberApiClient.products(),
      ]);
      setSuppliers(companiesData.filter((c) => c.companyType === "SUPPLIER"));
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

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const aCode = a.code;
    const bCode = b.code;
    const aPhone = a.phone;
    const bPhone = b.phone;
    const aEmailConfig = a.emailConfig;
    const bEmailConfig = b.emailConfig;
    if (sortColumn === "name") return direction * a.name.localeCompare(b.name);
    if (sortColumn === "code") return direction * (aCode || "").localeCompare(bCode || "");
    if (sortColumn === "contact") return direction * (aPhone || "").localeCompare(bPhone || "");
    if (sortColumn === "emailConfig")
      return direction * (keys(aEmailConfig || {}).length - keys(bEmailConfig || {}).length);
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
      const addressEntries = entries(formData.address).filter(([, v]) => v.trim() !== "");
      const cleanedAddress = addressEntries.length > 0 ? Object.fromEntries(addressEntries) : null;

      const emailConfig: Record<string, string> = {};
      if (formData.cocFromEmail.trim()) emailConfig.cocFromEmail = formData.cocFromEmail.trim();
      if (formData.stiFromEmail.trim()) emailConfig.stiFromEmail = formData.stiFromEmail.trim();
      if (formData.purchaseOrderToEmail.trim())
        emailConfig.purchaseOrderToEmail = formData.purchaseOrderToEmail.trim();
      if (formData.statementEmail.trim())
        emailConfig.statementEmail = formData.statementEmail.trim();

      const rawPayloadCode = formData.code;
      const rawPayloadVatNumber = formData.vatNumber;
      const rawPayloadRegistrationNumber = formData.registrationNumber;
      const rawPayloadNotes = formData.notes;
      const rawPayloadPhone = formData.phone;
      const rawPayloadContactPerson = formData.contactPerson;
      const payload = {
        name: formData.name,
        companyType: "SUPPLIER" as const,
        code: rawPayloadCode || undefined,
        vatNumber: rawPayloadVatNumber || undefined,
        registrationNumber: rawPayloadRegistrationNumber || undefined,
        isCompoundOwner: formData.isCompoundOwner,
        notes: rawPayloadNotes || undefined,
        phone: rawPayloadPhone || undefined,
        contactPerson: rawPayloadContactPerson || undefined,
        address: cleanedAddress || undefined,
        availableProducts: formData.availableProducts,
        emailConfig: keys(emailConfig).length > 0 ? emailConfig : undefined,
      };

      if (editingCompany) {
        await auRubberApiClient.updateCompany(editingCompany.id, payload);
      } else {
        await auRubberApiClient.createCompany(payload);
      }
      showToast(editingCompany ? "Supplier updated" : "Supplier created", "success");
      setActiveView("list");
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save supplier", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteCompany(id);
      showToast("Supplier deleted", "success");
      setDeleteCompanyId(null);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete supplier", "error");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Suppliers</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
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
            { label: "Suppliers", href: "/au-rubber/portal/companies/suppliers" },
            { label: editingCompany ? editingCompany.name : "New Supplier" },
          ]}
        />
        <SupplierDetailForm
          formData={formData}
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
      <Breadcrumb items={[{ label: "Companies" }, { label: "Suppliers" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            Suppliers
            <span className="ml-3 px-2.5 py-0.5 rounded-full text-sm bg-orange-100 text-orange-700">
              {suppliers.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage supplier companies, email configuration, and product access
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState
            message="Loading suppliers..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        ) : suppliers.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.building />}
            title="No suppliers yet"
            subtitle="Add your first supplier to get started"
            action={{
              label: "Add Supplier",
              onClick: openNewForm,
              className: "text-white bg-yellow-600 hover:bg-yellow-700",
            }}
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
                  onClick={() => handleSort("contact")}
                >
                  Contact
                  <SortIcon active={sortColumn === "contact"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("emailConfig")}
                >
                  Email Config
                  <SortIcon active={sortColumn === "emailConfig"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("isCompoundOwner")}
                >
                  Compound Owner
                  <SortIcon active={sortColumn === "isCompoundOwner"} direction={sortDirection} />
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
              {sortedSuppliers.map((supplier) => {
                const rawSupplierEmailConfig = supplier.emailConfig;
                const rawSupplierCode = supplier.code;
                const rawSupplierPhone = supplier.phone;
                const emailCount = keys(rawSupplierEmailConfig || {}).length;
                return (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                        {supplier.contactPerson && (
                          <p className="text-xs text-gray-500">{supplier.contactPerson}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rawSupplierCode || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{rawSupplierPhone || "-"}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {supplier.isCompoundOwner ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${supplier.availableProducts.length > 0 ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-500"}`}
                      >
                        {supplier.availableProducts.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditForm(supplier)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteCompanyId(supplier.id)}
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
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteCompanyId && handleDelete(deleteCompanyId)}
        onCancel={() => setDeleteCompanyId(null)}
      />
    </div>
  );
}
