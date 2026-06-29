"use client";

import { Eye, Upload, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

interface Affiliate {
  id: number;
  name: string;
}

interface PriceList {
  id: number;
  affiliateId: number;
  originalFilename: string;
  status: string;
  itemCount: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface PriceListItem {
  id: number;
  productCode: string;
  productDescription: string;
  minPrice: number;
  unit: string;
}

export default function PriceListsPage() {
  const searchParams = useSearchParams();
  const preselectedAffiliateId = searchParams.get("affiliateId");
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | null>(null);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewingItems, setViewingItems] = useState<PriceListItem[] | null>(null);

  const [showNewAffiliate, setShowNewAffiliate] = useState(false);
  const [newAffiliateForm, setNewAffiliateForm] = useState({
    name: "",
    contactName: "",
    email: "",
    commissionPercent: 0,
  });

  const fetchAffiliates = async () => {
    try {
      const data = await auRubberApiClient.affiliateCommissionAffiliates();
      setAffiliates(data as Affiliate[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load affiliates";
      alert({ message: msg, variant: "error" });
    }
  };

  const fetchPriceLists = async (affiliateId: number) => {
    setIsLoading(true);
    try {
      const data = await auRubberApiClient.affiliateCommissionPriceLists(affiliateId);
      setPriceLists(data as PriceList[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load price lists";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  useEffect(() => {
    if (preselectedAffiliateId) {
      const id = parseInt(preselectedAffiliateId, 10);
      if (!Number.isNaN(id)) {
        setSelectedAffiliateId(id);
        fetchPriceLists(id);
        return;
      }
    }
    setIsLoading(false);
  }, [preselectedAffiliateId]);

  const handleAffiliateChange = (affiliateId: number) => {
    setSelectedAffiliateId(affiliateId);
    fetchPriceLists(affiliateId);
  };

  const handleCreateAffiliate = async () => {
    try {
      await auRubberApiClient.affiliateCommissionCreateAffiliate({
        name: newAffiliateForm.name,
        contactName: newAffiliateForm.contactName,
        email: newAffiliateForm.email,
        commissionPercent: newAffiliateForm.commissionPercent || undefined,
      });
      showToast("Affiliate created", "success");
      setShowNewAffiliate(false);
      setNewAffiliateForm({ name: "", contactName: "", email: "", commissionPercent: 0 });
      await fetchAffiliates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create affiliate";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleUpload = async () => {
    if (!selectedAffiliateId || !uploadFile) return;
    try {
      await auRubberApiClient.affiliateCommissionUploadPriceList(selectedAffiliateId, uploadFile);
      showToast("Price list uploaded and processing", "success");
      setShowUpload(false);
      setUploadFile(null);
      fetchPriceLists(selectedAffiliateId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleViewItems = async (priceListId: number) => {
    if (!selectedAffiliateId) return;
    try {
      const data = await auRubberApiClient.affiliateCommissionPriceListItems(
        selectedAffiliateId,
        priceListId,
      );
      setViewingItems(data as PriceListItem[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load items";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    const firstFile = files?.[0];
    const file = firstFile || null;
    setUploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const selectedAffiliate = affiliates.find((a) => a.id === selectedAffiliateId);
  const naName = newAffiliateForm.name;
  const naContact = newAffiliateForm.contactName;
  const naEmail = newAffiliateForm.email;
  const canCreateAffiliate = naName.length > 0 && naContact.length > 0 && naEmail.length > 0;

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      {AlertDialog}
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            {
              label: "Affiliate & Commission",
              href: "/au-rubber/portal/accounting/affiliate-commission",
            },
            { label: "Price Lists" },
          ]}
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Affiliate Price Lists
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAffiliateId || ""}
            onChange={(e) => handleAffiliateChange(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm min-w-[200px]"
          >
            <option value="">Select an affiliate...</option>
            {affiliates.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewAffiliate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            + New Affiliate
          </button>

          {selectedAffiliateId && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Upload className="h-4 w-4" /> Upload PDF
            </button>
          )}
        </div>

        {selectedAffiliateId &&
          (isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
            </div>
          ) : priceLists.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No price lists uploaded yet for {selectedAffiliate?.name}.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3 w-16 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {priceLists.map((pl) => (
                    <tr
                      key={pl.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {pl.originalFilename}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                        {pl.itemCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            pl.status === "PROCESSED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : pl.status === "FAILED"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {pl.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {pl.uploadedAt
                          ? fromISO(pl.uploadedAt).toJSDate().toLocaleDateString("en-ZA")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewItems(pl.id)}
                          disabled={pl.status !== "PROCESSED"}
                          className="p-1.5 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-40 transition-colors"
                          title="View items"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      {showNewAffiliate &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowNewAffiliate(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  New Affiliate
                </h2>
                <button
                  onClick={() => setShowNewAffiliate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newAffiliateForm.name}
                    onChange={(e) =>
                      setNewAffiliateForm({ ...newAffiliateForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={newAffiliateForm.contactName}
                    onChange={(e) =>
                      setNewAffiliateForm({ ...newAffiliateForm, contactName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newAffiliateForm.email}
                    onChange={(e) =>
                      setNewAffiliateForm({ ...newAffiliateForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={newAffiliateForm.commissionPercent}
                    onChange={(e) =>
                      setNewAffiliateForm({
                        ...newAffiliateForm,
                        commissionPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewAffiliate(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAffiliate}
                  disabled={!canCreateAffiliate}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showUpload &&
        selectedAffiliateId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowUpload(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upload Price List PDF
                </h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Upload a PDF with the affiliate&apos;s minimum prices. The PDF should have columns
                for product code, description, and price (e.g. &quot;ITEM001 Widget R 150.00
                each&quot;).
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                    : uploadFile
                      ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                      : "border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-600"
                }`}
              >
                {uploadFile ? (
                  <div className="space-y-2">
                    <div className="text-green-600 dark:text-green-400 text-lg font-medium">
                      {uploadFile.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="text-xs text-red-500 hover:text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Drag & drop a PDF here, or click to browse
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const files = e.target.files;
                        const firstFile = files?.[0];
                        const file = firstFile || null;
                        setUploadFile(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  Upload & Process
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {viewingItems &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setViewingItems(null)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Price List Items
                </h2>
                <button
                  onClick={() => setViewingItems(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {viewingItems.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No items parsed from this price list.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Min Price</th>
                      <th className="px-3 py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                          {item.productCode}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {item.productDescription}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                          R {item.minPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>,
          document.body,
        )}
    </RequirePermission>
  );
}
