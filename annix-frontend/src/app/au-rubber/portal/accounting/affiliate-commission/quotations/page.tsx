"use client";

import { isObject, isString, values } from "es-toolkit/compat";
import { FileText, Mail, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { RequirePermission } from "@/app/au-rubber/components/RequirePermission";
import { PAGE_PERMISSIONS } from "@/app/au-rubber/config/pagePermissions";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";
import { DateTime } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";

interface QuoteItem {
  productCode: string;
  productDescription: string;
  colour: string;
  thickness: number;
  width: number;
  length: number;
  costPrice: number;
  rollWeight: number;
  priceKg: number;
  rollPrice: number;
  quantity: number;
  linePriceExVat: number;
  lineVat: number;
  linePriceIncVat: number;
}

const VAT_RATE = 0.15;

export default function QuotationsPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const [auCompany, setAuCompany] = useState<RubberCompanyDto | null>(null);
  const [customerCompanies, setCustomerCompanies] = useState<RubberCompanyDto[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerVat, setCustomerVat] = useState("");
  const [validTo, setValidTo] = useState(() => {
    return DateTime.now().plus({ days: 30 }).toISODate() ?? "";
  });
  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [markup, setMarkup] = useState("15");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedCompanyRef = useRef<RubberCompanyDto | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("quoteItems") || "[]");
      if (stored.length === 0) {
        showToast("No items in cart — start from the price list", "warning");
      }
      setItems(stored);
    } catch {
      setItems([]);
    }
    auRubberApiClient
      .companyById(3)
      .then(setAuCompany)
      .catch(() => {});
    auRubberApiClient
      .companies()
      .then((all) => setCustomerCompanies(all.filter((c) => c.companyType === "CUSTOMER")))
      .catch(() => {});
  }, [showToast]);

  const handleCustomerSelect = useCallback(
    (value: string) => {
      if (value === "__new__") {
        setSelectedCustomerId(null);
        setCustomerName("");
        setCustomerAddress("");
        setCustomerPhone("");
        setCustomerEmail("");
        setCustomerVat("");
        selectedCompanyRef.current = null;
        return;
      }
      const id = Number(value);
      setSelectedCustomerId(id);
      const company = customerCompanies.find((c) => c.id === id);
      if (company) {
        selectedCompanyRef.current = company;
        setCustomerName(company.name);
        const cAddr = company.address;
        const cAddrStr = isObject(cAddr) ? values(cAddr).filter(Boolean).join(", ") : "";
        setCustomerAddress(cAddrStr);
        const cPhone = company.phone;
        const cEmail = company.emailConfig?.email;
        const cVat = company.vatNumber;
        setCustomerPhone(cPhone ?? "");
        setCustomerEmail(cEmail ?? "");
        setCustomerVat(cVat ?? "");
      }
    },
    [customerCompanies],
  );

  useEffect(() => {
    const company = selectedCompanyRef.current;
    if (!selectedCustomerId || !company) return;
    const compPhone = company.phone;
    const compVat = company.vatNumber;
    const compEmail = company.emailConfig?.email;
    const compAddr = company.address;
    const compAddrStr = isObject(compAddr) ? values(compAddr).filter(Boolean).join(", ") : "";
    if (
      customerName === company.name &&
      customerPhone === (compPhone ?? "") &&
      customerVat === (compVat ?? "") &&
      customerEmail === (compEmail ?? "") &&
      customerAddress === compAddrStr
    ) {
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSavingCustomer(true);
      const updates: Record<string, unknown> = {};
      if (customerName !== company.name && customerName.trim()) updates.name = customerName.trim();
      if (customerPhone !== (compPhone ?? "")) updates.phone = customerPhone.trim() || null;
      if (customerVat !== (compVat ?? "")) updates.vatNumber = customerVat.trim() || null;
      if (customerEmail !== (compEmail ?? "")) {
        updates.emailConfig = { email: customerEmail.trim() || null };
      }
      if (customerAddress !== compAddrStr) {
        updates.address = { display: customerAddress.trim() || "" };
      }
      try {
        await auRubberApiClient.updateCompany(selectedCustomerId, updates);
        selectedCompanyRef.current = {
          ...company,
          name: isString(updates.name) ? updates.name : company.name,
          phone: isString(updates.phone) ? updates.phone : company.phone,
          vatNumber: isString(updates.vatNumber) ? updates.vatNumber : company.vatNumber,
          emailConfig: updates.emailConfig
            ? (updates.emailConfig as Record<string, string>)
            : company.emailConfig,
          address: updates.address ? (updates.address as Record<string, string>) : company.address,
        };
      } catch {
        // silently fail
      } finally {
        setSavingCustomer(false);
      }
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    customerName,
    customerAddress,
    customerPhone,
    customerEmail,
    customerVat,
    selectedCustomerId,
  ]);

  const updateQty = useCallback((index: number, qty: number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      item.quantity = qty;
      item.linePriceExVat = item.rollPrice * qty;
      item.lineVat = item.linePriceExVat * VAT_RATE;
      item.linePriceIncVat = item.linePriceExVat + item.lineVat;
      next[index] = item;
      return next;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      sessionStorage.setItem("quoteItems", JSON.stringify(next));
      return next;
    });
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.linePriceExVat, 0), [items]);
  const vatTotal = useMemo(() => items.reduce((sum, i) => sum + i.lineVat, 0), [items]);
  const grandTotal = useMemo(() => items.reduce((sum, i) => sum + i.linePriceIncVat, 0), [items]);

  const handleSave = useCallback(async () => {
    if (!customerName.trim()) {
      alert({ message: "Customer name is required", variant: "warning" });
      return;
    }
    if (items.length === 0) {
      alert({ message: "Add at least one line item", variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerEmail: customerEmail.trim() || null,
        customerVatNumber: customerVat.trim() || null,
        profit: totalProfit,
        status: "Unpaid",
        validTo: validTo || null,
        subtotal,
        vatTotal,
        grandTotal,
        items: items.map((i) => ({
          productCode: i.productCode,
          productDescription: i.productDescription,
          colour: i.colour,
          thickness: i.thickness,
          width: i.width,
          length: i.length,
          rollWeight: i.rollWeight,
          pricePerKg: i.priceKg,
          costPrice: i.costPrice,
          rollPrice: i.rollPrice,
          quantity: i.quantity,
          linePriceExVat: i.linePriceExVat,
          lineVat: i.lineVat,
          linePriceIncVat: i.linePriceIncVat,
        })),
      };
      const result = (await auRubberApiClient.quotationCreate(payload)) as { id: number };
      setQuotationId(result.id);
      sessionStorage.removeItem("quoteItems");
      showToast("Quotation saved", "success");
    } catch (err) {
      console.error("Save quotation failed", err);
      alert({ message: "Failed to save quotation", variant: "error" });
    } finally {
      setSaving(false);
    }
  }, [
    customerName,
    customerAddress,
    customerPhone,
    customerEmail,
    customerVat,
    validTo,
    items,
    subtotal,
    vatTotal,
    grandTotal,
    showToast,
    alert,
  ]);

  const ensureSaved = useCallback(async (): Promise<number> => {
    const payload = {
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim() || null,
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      customerVatNumber: customerVat.trim() || null,
      profit: totalProfit,
      status: "Unpaid",
      validTo: validTo || null,
      subtotal,
      vatTotal,
      grandTotal,
      items: items.map((i) => ({
        productCode: i.productCode,
        productDescription: i.productDescription,
        colour: i.colour,
        thickness: i.thickness,
        width: i.width,
        length: i.length,
        rollWeight: i.rollWeight,
        pricePerKg: i.priceKg,
        costPrice: i.costPrice,
        rollPrice: i.rollPrice,
        quantity: i.quantity,
        linePriceExVat: i.linePriceExVat,
        lineVat: i.lineVat,
        linePriceIncVat: i.linePriceIncVat,
      })),
    };
    if (quotationId) {
      await auRubberApiClient.quotationUpdate(quotationId, payload);
      return quotationId;
    }
    if (!customerName.trim()) {
      alert({ message: "Customer name is required", variant: "warning" });
      throw new Error("Validation failed");
    }
    if (items.length === 0) {
      alert({ message: "Add at least one line item", variant: "warning" });
      throw new Error("Validation failed");
    }
    setSaving(true);
    try {
      const result = (await auRubberApiClient.quotationCreate(payload)) as { id: number };
      setQuotationId(result.id);
      sessionStorage.removeItem("quoteItems");
      return result.id;
    } finally {
      setSaving(false);
    }
  }, [
    customerName,
    customerAddress,
    customerPhone,
    customerEmail,
    customerVat,
    validTo,
    items,
    subtotal,
    vatTotal,
    grandTotal,
    quotationId,
    alert,
  ]);

  useEffect(() => {
    const pct = Number(markup);
    if (!pct) return;
    setItems((prev) =>
      prev.map((i) => {
        const salePrice = i.costPrice * (1 + pct / 100);
        const rollPrice = i.rollWeight * salePrice;
        const lineExVat = rollPrice * i.quantity;
        const lineVat = lineExVat * VAT_RATE;
        const lineIncVat = lineExVat + lineVat;
        return {
          ...i,
          priceKg: salePrice,
          rollPrice,
          linePriceExVat: lineExVat,
          lineVat,
          linePriceIncVat: lineIncVat,
        };
      }),
    );
  }, [markup]);

  const totalProfit = useMemo(
    () => items.reduce((sum, i) => sum + (i.priceKg - i.costPrice) * i.rollWeight * i.quantity, 0),
    [items],
  );

  const handleViewPdf = useCallback(async () => {
    try {
      const id = await ensureSaved();
      const blob = await auRubberApiClient.quotationPdfBlob(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      // alert already shown by ensureSaved
    }
  }, [ensureSaved]);

  const handleSendEmail = useCallback(async () => {
    if (!customerEmail.trim()) {
      alert({ message: "Customer email is required", variant: "warning" });
      return;
    }
    setSendingEmail(true);
    try {
      const id = await ensureSaved();
      await auRubberApiClient.quotationSend(
        id,
        customerEmail.trim(),
        emailCc.trim() || undefined,
        emailBcc.trim() || undefined,
      );
      showToast("Quotation sent", "success");
      setShowEmailModal(false);
      setEmailCc("");
      setEmailBcc("");
    } catch (err) {
      console.error("Send quotation failed", err);
      alert({ message: "Failed to send quotation", variant: "error" });
    } finally {
      setSendingEmail(false);
    }
  }, [customerEmail, emailCc, emailBcc, ensureSaved, showToast, alert]);

  const handleEmailClick = useCallback(() => {
    if (!customerEmail.trim()) {
      alert({ message: "Enter a customer email first", variant: "warning" });
      return;
    }
    setEmailCc("");
    setEmailBcc("");
    setShowEmailModal(true);
  }, [customerEmail, alert]);

  const companyAddr = auCompany?.address;
  const companyAddrLines =
    companyAddr && isObject(companyAddr) ? values(companyAddr).filter(Boolean) : null;

  return (
    <RequirePermission
      permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting/affiliate-commission/quotations"]}
    >
      <div className="space-y-6 p-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/au-rubber/portal" },
            { label: "Accounting", href: "#" },
            {
              label: "Affiliate Commission",
              href: "/au-rubber/portal/accounting/affiliate-commission",
            },
            {
              label: "Price Lists",
              href: "/au-rubber/portal/accounting/affiliate-commission/price-lists",
            },
            { label: "New Quotation" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {quotationId ? `Quotation #${quotationId}` : "New Quotation"}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-500 dark:text-gray-400">% Mark Up</label>
              <select
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="0">0%</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Profit:{" "}
              <span className="font-mono text-yellow-600 dark:text-yellow-400">
                R{totalProfit.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleViewPdf}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <FileText className="h-4 w-4" /> View PDF
            </button>
            <button
              onClick={handleEmailClick}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Mail className="h-4 w-4" /> Email Quotation
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Quotation
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Customer Details
              {savingCustomer && (
                <span className="ml-2 text-xs font-normal text-yellow-600 dark:text-yellow-400">
                  Saving…
                </span>
              )}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Customer *</label>
                <select
                  value={selectedCustomerId ?? "__new__"}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="__new__">Add new customer</option>
                  {customerCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Customer address"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">VAT Number</label>
                  <input
                    type="text"
                    value={customerVat}
                    onChange={(e) => setCustomerVat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="VAT number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valid To</label>
                  <input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {auCompany && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                AU Industries (Pty) Ltd
              </h2>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>{auCompany.name}</p>
                {companyAddrLines?.map((line, i) => (
                  <p key={i}>{String(line)}</p>
                ))}
                {auCompany.phone && <p>Tel: {auCompany.phone}</p>}
                {auCompany.emailConfig?.email && <p>Email: {auCompany.emailConfig.email}</p>}
                {auCompany.vatNumber && <p>VAT: {auCompany.vatNumber}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Product Name</th>
                  <th className="px-4 py-3 text-left">Colour</th>
                  <th className="px-4 py-3 text-left">Dimensions</th>
                  <th className="px-4 py-3 text-right">Roll Wt</th>
                  <th className="px-4 py-3 text-right">Price/Kg</th>
                  <th className="px-4 py-3 text-right">Roll Price</th>
                  <th className="px-4 py-3 text-center">QTY</th>
                  <th className="px-4 py-3 text-right">Ex VAT</th>
                  <th className="px-4 py-3 text-right">VAT</th>
                  <th className="px-4 py-3 text-right">Inc VAT</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item, idx) => {
                  const lineProfit =
                    (item.priceKg - item.costPrice) * item.rollWeight * item.quantity;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-800 dark:text-gray-200">
                        {item.productCode}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">
                        {item.productDescription}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                        {item.colour}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {item.thickness != null
                          ? `${item.thickness}mm x ${item.width}mm x ${item.length}m`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                        {item.rollWeight.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                        R{item.priceKg.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                        R{item.rollPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQty(idx, Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                        R{item.linePriceExVat.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                        R{item.lineVat.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                        R{item.linePriceIncVat.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-green-600 dark:text-green-400">
                        R{lineProfit.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No items — start from the{" "}
                      <a
                        href="/au-rubber/portal/accounting/affiliate-commission/price-lists"
                        className="text-yellow-600 hover:underline"
                      >
                        price list
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex justify-end">
            <div className="w-72 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-mono">R{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>VAT (15%)</span>
                <span className="font-mono">R{vatTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span className="font-mono">R{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Email Quotation
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="email"
                  value={customerEmail}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CC</label>
                <input
                  type="text"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="cc@example.com (comma-separated)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">BCC</label>
                <input
                  type="text"
                  value={emailBcc}
                  onChange={(e) => setEmailBcc(e.target.value)}
                  placeholder="bcc@example.com (comma-separated)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg"
              >
                {sendingEmail ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {AlertDialog}
    </RequirePermission>
  );
}
