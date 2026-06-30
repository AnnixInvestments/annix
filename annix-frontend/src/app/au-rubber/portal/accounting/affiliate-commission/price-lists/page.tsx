"use client";

import { ChevronDown, ChevronRight, Download, ShoppingCart, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

interface PriceList {
  id: number;
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
  elongation: string;
  sg: number;
  mpa: string;
  colour: string;
  cureType: string;
  minPrice: number;
  unit: string;
}

export default function PriceListsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filter, setFilter] = useState("");
  const [thickness, setThickness] = useState("6");
  const [width, setWidth] = useState("1200");
  const [length, setLength] = useState("12.0");
  const [rollCounts, setRollCounts] = useState<Record<number, number>>({});
  const [cartCount, setCartCount] = useState(0);

  const thicknessOptions = useMemo(() => Array.from({ length: 28 }, (_, i) => i + 3), []);
  const widthOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => 800 + i * 50), []);
  const lengthOptions = useMemo(
    () => Array.from({ length: 10 }, (_, i) => (8 + i * 0.5).toFixed(1)),
    [],
  );
  const rollCountOptions = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), []);

  const fetchPriceLists = useCallback(async () => {
    try {
      const data = await auRubberApiClient.affiliateCommissionPriceLists();
      setPriceLists(data as PriceList[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load price lists";
      alert({ message: msg, variant: "error" });
    }
  }, [alert]);

  const fetchLatestItems = useCallback(async () => {
    try {
      const data = await auRubberApiClient.affiliateCommissionLatestPriceListItems();
      setItems(data as PriceListItem[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load items";
      alert({ message: msg, variant: "error" });
    }
  }, [alert]);

  useEffect(() => {
    Promise.all([fetchPriceLists(), fetchLatestItems()]).finally(() => setIsLoading(false));
    try {
      const stored = JSON.parse(sessionStorage.getItem("quoteItems") || "[]");
      setCartCount(stored.length);
    } catch {
      /* ignore */
    }
  }, [fetchPriceLists, fetchLatestItems]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    try {
      await auRubberApiClient.affiliateCommissionUploadPriceList(uploadFile);
      showToast("Price list uploaded and processing", "success");
      setShowUpload(false);
      setUploadFile(null);
      await Promise.all([fetchPriceLists(), fetchLatestItems()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await auRubberApiClient.affiliateCommissionDownloadLatestPriceList();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const originalFilename = latestProcessed?.originalFilename;
      a.href = url;
      a.download = originalFilename || "price-list.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert({ message: "Failed to download price list", variant: "error" });
    }
  };

  const handleAddToQuote = (item: PriceListItem) => {
    const t = Number(thickness);
    const w = Number(width);
    const l = Number(length);
    const rc = rollCounts[item.id];
    const qty = rc ?? 1;
    if (!t || !w || !l || !item.sg) {
      alert({ message: "Select thickness, width and length first", variant: "warning" });
      return;
    }
    const rollWeight = (t * w * l * item.sg) / 1000;
    const rollPrice = rollWeight * item.minPrice;
    const lineExVat = rollPrice * qty;
    const vat = lineExVat * 0.15;
    const lineIncVat = lineExVat + vat;
    const quoteItem = {
      productCode: item.productCode,
      productDescription: item.productDescription,
      colour: item.colour,
      thickness: t,
      width: w,
      length: l,
      rollWeight,
      priceKg: item.minPrice,
      costPrice: item.minPrice,
      rollPrice,
      quantity: qty,
      linePriceExVat: lineExVat,
      lineVat: vat,
      linePriceIncVat: lineIncVat,
    };
    const existing = JSON.parse(sessionStorage.getItem("quoteItems") || "[]");
    existing.push(quoteItem);
    sessionStorage.setItem("quoteItems", JSON.stringify(existing));
    setCartCount(existing.length);
    showToast("Added to quote", "success");
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

  const filteredItems = useMemo(() => {
    if (!filter) return items;
    const q = filter.toLowerCase();
    return items.filter(
      (item) =>
        item.productCode.toLowerCase().includes(q) ||
        item.productDescription.toLowerCase().includes(q) ||
        item.colour?.toLowerCase().includes(q),
    );
  }, [items, filter]);

  const grouped = useMemo(() => {
    const uncured = filteredItems.filter((i) => i.cureType === "uncured");
    const precured = filteredItems.filter((i) => i.cureType === "pre-cured");
    const other = filteredItems.filter(
      (i) => i.cureType !== "uncured" && i.cureType !== "pre-cured",
    );
    return { uncured, precured, other };
  }, [filteredItems]);

  const latestProcessed = priceLists
    .filter((pl) => pl.status === "PROCESSED")
    .sort((a, b) => fromISO(b.uploadedAt).toMillis() - fromISO(a.uploadedAt).toMillis())[0];

  const renderTable = (label: string, groupItems: PriceListItem[]) => {
    if (groupItems.length === 0) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 px-4">
          {label}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              <th className="px-4 py-3 w-[7%]">Product Code</th>
              <th className="px-4 py-3 w-[7%]">Colour</th>
              <th className="px-4 py-3 w-[12%]">Product Name</th>
              <th className="px-4 py-3 w-[8%]">Elongation</th>
              <th className="px-4 py-3 w-[8%]">MPa</th>
              <th className="px-4 py-3 w-[6%]">SG</th>
              <th className="px-4 py-3 w-[10%]">Price / kg</th>
              <th className="px-4 py-3 w-[8%]">Roll Wt</th>
              <th className="px-4 py-3 w-[11%]">Roll Price Ex VAT</th>
              <th className="px-4 py-3 w-[6%]">Rolls</th>
              <th className="px-4 py-3 w-[6%]"></th>
            </tr>
          </thead>
          <tbody>
            {groupItems.map((item) => {
              const selectedRollCount = rollCounts[item.id];
              return (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {item.productCode}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{item.colour}</td>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">
                    {item.productDescription}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {item.elongation}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {item.mpa}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {item.sg ? item.sg.toFixed(2) : "-"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-gray-100 font-medium">
                    R {item.minPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400">
                    {thickness && width && length && item.sg
                      ? `${((Number(thickness) * Number(width) * Number(length) * item.sg) / 1000).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-900 dark:text-gray-100 font-medium">
                    {thickness && width && length && item.sg
                      ? `R ${((Number(thickness) * Number(width) * Number(length) * item.sg * item.minPrice) / 1000).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={selectedRollCount ?? ""}
                      onChange={(e) =>
                        setRollCounts((prev) => ({
                          ...prev,
                          [item.id]: Number(e.target.value),
                        }))
                      }
                      className="px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs w-14"
                    >
                      <option value=""></option>
                      {rollCountOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleAddToQuote(item)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
                    >
                      <ShoppingCart className="h-3 w-3" /> Add
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Base Price List</h1>
          <div className="flex items-center gap-3">
            {cartCount > 0 && (
              <button
                onClick={() =>
                  router.push("/au-rubber/portal/accounting/affiliate-commission/quotations")
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                Go to Quote ({cartCount})
              </button>
            )}
            {latestProcessed && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            )}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Upload className="h-4 w-4" /> Upload New Price List
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
          Upload a PDF with product prices per kg. Nix will analyse it and extract each product with
          its base price, structured specs, and cure type. All affiliates work from this single base
          price list.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : items.length === 0 && priceLists.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No price list uploaded yet. Click &quot;Upload New Price List&quot; to add one.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm w-20"
              >
                <option value="">mm</option>
                {thicknessOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm w-24"
              >
                <option value="">width</option>
                {widthOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm w-20"
              >
                <option value="">len</option>
                {lengthOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search products..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm w-64"
              />
              {latestProcessed && (
                <span className="text-xs text-gray-400">
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} from{" "}
                  {latestProcessed.originalFilename}
                </span>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {grouped.uncured.length > 0 && (
                <div
                  className={
                    grouped.precured.length > 0 || grouped.other.length > 0
                      ? "border-b border-gray-200 dark:border-gray-600"
                      : ""
                  }
                >
                  {renderTable("Uncured", grouped.uncured)}
                </div>
              )}
              {grouped.precured.length > 0 && (
                <div
                  className={
                    grouped.other.length > 0 ? "border-b border-gray-200 dark:border-gray-600" : ""
                  }
                >
                  {renderTable("Pre-Cured", grouped.precured)}
                </div>
              )}
              {grouped.other.length > 0 && renderTable("Other", grouped.other)}
              {filteredItems.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                  No items match the current filter.
                </div>
              )}
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span>Upload History ({priceLists.length})</span>
                {showHistory ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {showHistory && (
                <div className="border-t border-gray-200 dark:border-gray-600">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        <th className="px-4 py-2">Filename</th>
                        <th className="px-4 py-2">Items</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceLists.map((pl) => (
                        <tr
                          key={pl.id}
                          className={`border-b border-gray-100 dark:border-gray-700 ${
                            pl.id === latestProcessed?.id
                              ? "bg-yellow-50 dark:bg-yellow-900/10"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                            {pl.originalFilename}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono">
                            {pl.itemCount}
                          </td>
                          <td className="px-4 py-2">
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
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">
                            {pl.uploadedAt
                              ? fromISO(pl.uploadedAt).toJSDate().toLocaleDateString("en-ZA")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showUpload &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowUpload(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upload Base Price List
                </h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Drop a PDF with your product prices per kg. Nix will analyse it and extract each
                product with its base price, specs, and cure type for all affiliates.
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
    </RequirePermission>
  );
}
