"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CreateCompoundOpeningStockDto,
  type ExtractedDeliveryNoteData,
  type ExtractedDeliveryNoteRoll,
  type ImportCompoundOpeningStockResultDto,
  type ImportCompoundOpeningStockRowDto,
  type RubberCompoundMovementDto,
  type RubberCompoundStockDto,
  type RubberDeliveryNoteDto,
  type RubberTaxInvoiceDto,
  type StockLocationDto,
} from "@/app/lib/api/auRubberApi";
import type {
  RubberOrderDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { TableLoadingState } from "../../components/TableComponents";

interface CompoundSection {
  stock: RubberCompoundStockDto;
  receivedMovements: RubberCompoundMovementDto[];
  dispatchedMovements: RubberCompoundMovementDto[];
  totalReceived: number;
  totalDispatched: number;
  committedKg: number;
  committedOrders: {
    orderId: number;
    orderNumber: string;
    companyName: string | null;
    productTitle: string | null;
    quantity: number | null;
    totalKg: number;
  }[];
  linkedInvoices: Map<number, RubberTaxInvoiceDto>;
  linkedDeliveryNotes: Map<number, RubberDeliveryNoteDto>;
}

function rollsFromExtractedData(
  data: ExtractedDeliveryNoteData | ExtractedDeliveryNoteData[] | null,
): ExtractedDeliveryNoteRoll[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap((d) => d.rolls || []);
  }
  return data.rolls || [];
}

function formatKg(kg: number): string {
  return `${kg.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

function StockBar(props: { actual: number; committed: number }) {
  const { actual, committed } = props;
  const available = actual - committed;
  const maxVal = Math.max(actual, 1);
  const committedPct = Math.min((committed / maxVal) * 100, 100);

  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div className="h-full flex">
        <div
          className="bg-green-500 h-full"
          style={{ width: `${Math.max(100 - committedPct, 0)}%` }}
        />
        {committed > 0 && (
          <div
            className="bg-amber-400 h-full"
            style={{ width: `${committedPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function CompoundCard(props: { section: CompoundSection; isExpanded: boolean; onToggle: () => void }) {
  const { section, isExpanded, onToggle } = props;
  const { stock } = section;
  const available = stock.quantityKg - section.committedKg;
  const isLow = stock.isLowStock;

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${isLow ? "ring-2 ring-red-300" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="text-left">
              <span className="text-sm font-semibold text-gray-900">{stock.compoundName || "Unknown"}</span>
              {stock.compoundCode && (
                <span className="ml-2 text-xs text-gray-500">({stock.compoundCode})</span>
              )}
              {isLow && (
                <span className="ml-2 px-2 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Low Stock
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <p className="text-xs text-gray-500">Actual SOH</p>
              <p className={`text-sm font-bold ${isLow ? "text-red-600" : "text-gray-900"}`}>
                {formatKg(stock.quantityKg)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Committed</p>
              <p className="text-sm font-bold text-amber-600">
                {formatKg(section.committedKg)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Available</p>
              <p className={`text-sm font-bold ${available < 0 ? "text-red-600" : "text-green-600"}`}>
                {formatKg(available)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 px-9">
          <StockBar actual={stock.quantityKg} committed={section.committedKg} />
          <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
            <span>0 kg</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1" />Available</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-1" />Committed</span>
            </div>
            <span>{formatKg(stock.quantityKg)}</span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 px-6 py-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {stock.location && <span>Location: {stock.location}</span>}
              {stock.batchNumber && <span>| Batch: {stock.batchNumber}</span>}
              <span>| Reorder: {formatKg(stock.reorderPointKg)}</span>
            </div>
            <Link
              href={`/au-rubber/portal/compound-stocks/${stock.id}`}
              className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
            >
              Manage Stock
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ReceivedSection
              movements={section.receivedMovements}
              invoices={section.linkedInvoices}
              totalReceived={section.totalReceived}
            />
            <CommittedSection
              committedOrders={section.committedOrders}
              totalCommitted={section.committedKg}
            />
            <DispatchedSection
              movements={section.dispatchedMovements}
              deliveryNotes={section.linkedDeliveryNotes}
              totalDispatched={section.totalDispatched}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReceivedSection(props: {
  movements: RubberCompoundMovementDto[];
  invoices: Map<number, RubberTaxInvoiceDto>;
  totalReceived: number;
}) {
  const { movements, invoices, totalReceived } = props;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2 flex items-center justify-between">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          Received (S&N STIs)
        </span>
        <span className="text-green-600">{formatKg(totalReceived)}</span>
      </h4>
      {movements.length === 0 ? (
        <p className="text-sm text-gray-500">No receipts recorded</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {movements.map((m) => {
            const invoice = m.referenceId ? invoices.get(m.referenceId) : null;
            return (
              <div key={m.id} className="p-2 rounded border border-gray-100 bg-gray-50 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-700">+{formatKg(m.quantityKg)}</span>
                  <span className="text-xs text-gray-400">{m.createdAt.split("T")[0]}</span>
                </div>
                {invoice && (
                  <Link
                    href={`/au-rubber/portal/tax-invoices/${invoice.id}`}
                    className="text-xs text-yellow-600 hover:underline"
                  >
                    {invoice.invoiceNumber} - {invoice.companyName || "Unknown"}
                  </Link>
                )}
                {!invoice && m.referenceType && (
                  <p className="text-xs text-gray-500">{m.referenceType.replace(/_/g, " ")}</p>
                )}
                {m.batchNumber && <p className="text-xs text-gray-400">Batch: {m.batchNumber}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommittedSection(props: {
  committedOrders: CompoundSection["committedOrders"];
  totalCommitted: number;
}) {
  const { committedOrders, totalCommitted } = props;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2 flex items-center justify-between">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
          Committed (POs)
        </span>
        <span className="text-amber-600">{formatKg(totalCommitted)}</span>
      </h4>
      <p className="text-xs text-gray-400 mb-2">
        Theoretical weight from active customer orders. Actual SOH only reduces when rolls are dispatched.
      </p>
      {committedOrders.length === 0 ? (
        <p className="text-sm text-gray-500">No active commitments</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {committedOrders.map((co, idx) => (
            <Link
              key={`${co.orderId}-${idx}`}
              href={`/au-rubber/portal/orders/${co.orderId}`}
              className="block p-2 rounded border border-gray-100 bg-amber-50 text-sm hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-700">{co.orderNumber}</span>
                <span className="font-medium text-amber-700">{formatKg(co.totalKg)}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-500">{co.companyName || "Unknown customer"}</span>
                <span className="text-xs text-gray-500">
                  {co.quantity || 0} roll{(co.quantity || 0) !== 1 ? "s" : ""}
                </span>
              </div>
              {co.productTitle && (
                <p className="text-xs text-gray-400 mt-0.5">{co.productTitle}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DispatchedSection(props: {
  movements: RubberCompoundMovementDto[];
  deliveryNotes: Map<number, RubberDeliveryNoteDto>;
  totalDispatched: number;
}) {
  const { movements, deliveryNotes, totalDispatched } = props;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2 flex items-center justify-between">
        <span className="flex items-center">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
          Dispatched (DNs)
        </span>
        <span className="text-red-600">{formatKg(totalDispatched)}</span>
      </h4>
      {movements.length === 0 ? (
        <p className="text-sm text-gray-500">No dispatches recorded</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {movements.map((m) => {
            const dn = m.referenceId ? deliveryNotes.get(m.referenceId) : null;
            const rolls = dn ? rollsFromExtractedData(dn.extractedData) : [];

            return (
              <div key={m.id} className="p-2 rounded border border-gray-100 bg-red-50 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-700">-{formatKg(m.quantityKg)}</span>
                  <span className="text-xs text-gray-400">{m.createdAt.split("T")[0]}</span>
                </div>
                {dn && (
                  <Link
                    href={`/au-rubber/portal/delivery-notes/${dn.id}`}
                    className="text-xs text-yellow-600 hover:underline"
                  >
                    DN: {dn.deliveryNoteNumber || `#${dn.id}`} - {dn.supplierCompanyName || ""}
                  </Link>
                )}
                {!dn && m.referenceType && (
                  <p className="text-xs text-gray-500">{m.referenceType.replace(/_/g, " ")}</p>
                )}
                {rolls.length > 0 && (
                  <div className="mt-1 ml-2 space-y-0.5">
                    {rolls.map((roll, ri) => (
                      <div key={ri} className="flex items-center justify-between text-xs text-gray-500">
                        <span>Roll {roll.rollNumber || ri + 1}</span>
                        <div className="flex items-center space-x-3">
                          {roll.weightKg !== undefined && <span>{roll.weightKg} kg</span>}
                          {roll.deliveryDate && <span>{roll.deliveryDate}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {m.batchNumber && <p className="text-xs text-gray-400 mt-1">Batch: {m.batchNumber}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CompoundStocksPage() {
  const { showToast } = useToast();

  const [sections, setSections] = useState<CompoundSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [compounds, setCompounds] = useState<RubberProductCodingDto[]>([]);
  const [locations, setLocations] = useState<StockLocationDto[]>([]);
  const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
  const [openingStockTab, setOpeningStockTab] = useState<"single" | "bulk">("single");
  const [openingStockForm, setOpeningStockForm] = useState<CreateCompoundOpeningStockDto>({
    compoundCodingId: 0,
    quantityKg: 0,
    costPerKg: null,
    minStockLevelKg: 0,
    reorderPointKg: 0,
    locationId: null,
    batchNumber: null,
    notes: null,
  });
  const [compoundInput, setCompoundInput] = useState("");
  const [isSubmittingOpeningStock, setIsSubmittingOpeningStock] = useState(false);
  const [csvData, setCsvData] = useState<ImportCompoundOpeningStockRowDto[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportCompoundOpeningStockResultDto | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [
        stocksData,
        movementsData,
        invoicesData,
        deliveryNotesData,
        ordersData,
        productsData,
        compoundsData,
        locationsData,
      ] = await Promise.all([
        auRubberApiClient.compoundStocks(),
        auRubberApiClient.compoundMovements(),
        auRubberApiClient.taxInvoices({ invoiceType: "SUPPLIER" }),
        auRubberApiClient.deliveryNotes(),
        auRubberApiClient.orders(),
        auRubberApiClient.products(),
        auRubberApiClient.productCodings("COMPOUND"),
        auRubberApiClient.stockLocations(),
      ]);

      const stocks = Array.isArray(stocksData) ? stocksData : [];
      const movements = Array.isArray(movementsData) ? movementsData : [];
      const invoices = Array.isArray(invoicesData) ? invoicesData : [];
      const deliveryNotes = Array.isArray(deliveryNotesData) ? deliveryNotesData : [];
      const orders = Array.isArray(ordersData) ? ordersData : [];
      const products = Array.isArray(productsData) ? productsData : [];

      setCompounds(Array.isArray(compoundsData) ? compoundsData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);

      const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));
      const dnMap = new Map(deliveryNotes.map((dn) => [dn.id, dn]));
      const productMap = new Map(products.map((p) => [p.id, p]));

      const activeOrders = orders.filter(
        (o) => o.status >= 2 && o.status <= 5,
      );

      const builtSections: CompoundSection[] = stocks.map((stock) => {
        const stockMovements = movements.filter((m) => m.compoundStockId === stock.id);
        const receivedMovements = stockMovements
          .filter((m) => m.movementType === "IN")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const dispatchedMovements = stockMovements
          .filter((m) => m.movementType === "OUT")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const totalReceived = receivedMovements.reduce((sum, m) => sum + m.quantityKg, 0);
        const totalDispatched = dispatchedMovements.reduce((sum, m) => sum + m.quantityKg, 0);

        const linkedInvoices = new Map<number, RubberTaxInvoiceDto>();
        receivedMovements.forEach((m) => {
          if (m.referenceId && (m.referenceType === "INVOICE_RECEIPT" || m.referenceType === "COC_RECEIPT")) {
            const inv = invoiceMap.get(m.referenceId);
            if (inv) linkedInvoices.set(m.referenceId, inv);
          }
        });

        const linkedDeliveryNotes = new Map<number, RubberDeliveryNoteDto>();
        dispatchedMovements.forEach((m) => {
          if (m.referenceId && m.referenceType === "DELIVERY_DEDUCTION") {
            const dn = dnMap.get(m.referenceId);
            if (dn) linkedDeliveryNotes.set(m.referenceId, dn);
          }
        });

        const committedOrders: CompoundSection["committedOrders"] = [];
        let committedKg = 0;

        activeOrders.forEach((order) => {
          order.items.forEach((item) => {
            if (!item.productId) return;
            const product = productMap.get(item.productId);
            if (!product) return;
            const compoundMatch =
              product.compoundName === stock.compoundName ||
              (product.compoundFirebaseUid && stock.compoundCode && product.compoundName === stock.compoundName);
            if (!compoundMatch) return;

            const itemKg = item.totalKg || 0;
            committedKg += itemKg;
            committedOrders.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              companyName: order.companyName,
              productTitle: product.title,
              quantity: item.quantity,
              totalKg: itemKg,
            });
          });
        });

        return {
          stock,
          receivedMovements,
          dispatchedMovements,
          totalReceived,
          totalDispatched,
          committedKg,
          committedOrders,
          linkedInvoices,
          linkedDeliveryNotes,
        };
      });

      builtSections.sort((a, b) => (a.stock.compoundName || "").localeCompare(b.stock.compoundName || ""));
      setSections(builtSections);
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

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredSections.map((s) => s.stock.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const filteredSections = sections.filter((s) => {
    const matchesSearch =
      searchQuery === "" ||
      s.stock.compoundName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.stock.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !showLowStockOnly || s.stock.isLowStock;
    return matchesSearch && matchesLowStock;
  });

  const totalActualSOH = filteredSections.reduce((sum, s) => sum + s.stock.quantityKg, 0);
  const totalCommitted = filteredSections.reduce((sum, s) => sum + s.committedKg, 0);
  const totalAvailable = totalActualSOH - totalCommitted;
  const lowStockCount = sections.filter((s) => s.stock.isLowStock).length;

  const resetOpeningStockForm = () => {
    setOpeningStockForm({
      compoundCodingId: 0,
      quantityKg: 0,
      costPerKg: null,
      minStockLevelKg: 0,
      reorderPointKg: 0,
      locationId: null,
      batchNumber: null,
      notes: null,
    });
    setCompoundInput("");
    setCsvData([]);
    setCsvFileName("");
    setImportResult(null);
    setOpeningStockTab("single");
  };

  const handleCreateOpeningStock = async () => {
    if (!compoundInput.trim() || !openingStockForm.quantityKg) {
      showToast("Please fill in compound and quantity", "error");
      return;
    }

    try {
      setIsSubmittingOpeningStock(true);

      const codingId = await (async () => {
        if (openingStockForm.compoundCodingId) {
          return openingStockForm.compoundCodingId;
        }

        const existingCoding = compounds.find(
          (c) => c.code.toLowerCase() === compoundInput.trim().toLowerCase(),
        );

        if (existingCoding) {
          return existingCoding.id;
        }

        const newCoding = await auRubberApiClient.createProductCoding({
          codingType: "COMPOUND",
          code: compoundInput.trim().toUpperCase(),
          name: compoundInput.trim(),
        });
        setCompounds([...compounds, newCoding]);
        return newCoding.id;
      })();

      await auRubberApiClient.createCompoundOpeningStock({
        ...openingStockForm,
        compoundCodingId: codingId,
      });
      showToast("Opening stock created successfully", "success");
      setShowOpeningStockModal(false);
      resetOpeningStockForm();
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create opening stock", "error");
    } finally {
      setIsSubmittingOpeningStock(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows: ImportCompoundOpeningStockRowDto[] = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          compoundCode: values[headers.indexOf("compound_code")] || "",
          quantityKg: Number(values[headers.indexOf("quantity_kg")]) || 0,
          costPerKg: values[headers.indexOf("cost_per_kg")]
            ? Number(values[headers.indexOf("cost_per_kg")])
            : null,
          minStockLevelKg: values[headers.indexOf("min_stock_level_kg")]
            ? Number(values[headers.indexOf("min_stock_level_kg")])
            : null,
          reorderPointKg: values[headers.indexOf("reorder_point_kg")]
            ? Number(values[headers.indexOf("reorder_point_kg")])
            : null,
          location: values[headers.indexOf("location")] || null,
          batchNumber: values[headers.indexOf("batch_number")] || null,
        };
      });
      setCsvData(rows.filter((r) => r.compoundCode && r.quantityKg > 0));
    };
    reader.readAsText(file);
  };

  const handleImportOpeningStock = async () => {
    if (csvData.length === 0) {
      showToast("No valid data to import", "error");
      return;
    }
    try {
      setIsImporting(true);
      const result = await auRubberApiClient.importCompoundOpeningStock(csvData);
      setImportResult(result);
      if (result.errors.length === 0) {
        showToast(
          `Successfully imported: ${result.created} created, ${result.updated} updated`,
          "success",
        );
        setShowOpeningStockModal(false);
        resetOpeningStockForm();
        fetchData();
      } else {
        showToast(
          `Imported ${result.created + result.updated} of ${result.totalRows} with errors`,
          "warning",
        );
        fetchData();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to import opening stock", "error");
    } finally {
      setIsImporting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Compound Inventory" }]} />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
            <p className="text-gray-600">{error.message}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Compound Inventory" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compound Stock Overview</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live compound stock levels with received, committed, and dispatched tracking
          </p>
        </div>
        <button
          onClick={() => setShowOpeningStockModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Opening Stock
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <TableLoadingState message="Loading compound stock data..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-gray-500">Total Compounds</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{sections.length}</p>
              {lowStockCount > 0 && (
                <p className="text-xs text-red-600 mt-1">{lowStockCount} low stock</p>
              )}
            </div>
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-green-500">
              <p className="text-sm font-medium text-gray-500">Actual SOH</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatKg(totalActualSOH)}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-amber-400">
              <p className="text-sm font-medium text-gray-500">Committed (POs)</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{formatKg(totalCommitted)}</p>
            </div>
            <div className={`bg-white shadow rounded-lg p-5 border-l-4 ${totalAvailable < 0 ? "border-red-500" : "border-blue-500"}`}>
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className={`text-2xl font-bold mt-1 ${totalAvailable < 0 ? "text-red-600" : "text-gray-900"}`}>
                {formatKg(totalAvailable)}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Search:</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Compound name or code"
                  className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
                />
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
              </label>
              <div className="flex-1" />
              <div className="flex items-center space-x-2">
                <button
                  onClick={expandAll}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Expand All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={collapseAll}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500">
                {searchQuery || showLowStockOnly
                  ? "No compounds match your filters"
                  : "No compound stocks found. Add opening stock to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSections.map((section) => (
                <CompoundCard
                  key={section.stock.id}
                  section={section}
                  isExpanded={expandedIds.has(section.stock.id)}
                  onToggle={() => toggleExpand(section.stock.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showOpeningStockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-10"
              onClick={() => {
                setShowOpeningStockModal(false);
                resetOpeningStockForm();
              }}
            />
            <div className="relative z-20 bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Opening Stock</h3>

              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setOpeningStockTab("single")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      openingStockTab === "single"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Single Entry
                  </button>
                  <button
                    onClick={() => setOpeningStockTab("bulk")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      openingStockTab === "bulk"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Bulk Import
                  </button>
                </nav>
              </div>

              {openingStockTab === "single" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Compound <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="compound-options"
                        value={compoundInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCompoundInput(value);
                          const match = compounds.find(
                            (c) =>
                              c.code.toLowerCase() === value.toLowerCase() ||
                              `${c.code} - ${c.name}`.toLowerCase() === value.toLowerCase(),
                          );
                          setOpeningStockForm({
                            ...openingStockForm,
                            compoundCodingId: match ? match.id : 0,
                          });
                        }}
                        placeholder="Type or select compound code"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      />
                      <datalist id="compound-options">
                        {compounds.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </datalist>
                      <p className="mt-1 text-xs text-gray-500">
                        Select existing or type a new compound code
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.quantityKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            quantityKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="100.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cost per kg (ZAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.costPerKg != null ? openingStockForm.costPerKg : ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            costPerKg: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="50.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min Stock Level (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.minStockLevelKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            minStockLevelKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reorder Point (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openingStockForm.reorderPointKg || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            reorderPointKg: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <select
                        value={openingStockForm.locationId != null ? openingStockForm.locationId : ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            locationId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      >
                        <option value="">Select location</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                      <input
                        type="text"
                        value={openingStockForm.batchNumber || ""}
                        onChange={(e) =>
                          setOpeningStockForm({
                            ...openingStockForm,
                            batchNumber: e.target.value || null,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={openingStockForm.notes || ""}
                      onChange={(e) =>
                        setOpeningStockForm({
                          ...openingStockForm,
                          notes: e.target.value || null,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      rows={2}
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowOpeningStockModal(false);
                        resetOpeningStockForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateOpeningStock}
                      disabled={isSubmittingOpeningStock}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isSubmittingOpeningStock ? "Creating..." : "Create Opening Stock"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        {csvFileName || "Click to upload CSV file"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Columns: compound_code, quantity_kg, cost_per_kg, min_stock_level_kg,
                        reorder_point_kg, location, batch_number
                      </p>
                    </label>
                  </div>

                  {csvData.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                        Preview ({csvData.length} rows)
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Compound
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Qty (kg)
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Cost/kg
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Location
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.slice(0, 10).map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.compoundCode}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.quantityKg}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {row.costPerKg != null ? row.costPerKg : "-"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">{row.location || "-"}</td>
                              </tr>
                            ))}
                            {csvData.length > 10 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-2 text-sm text-gray-500 text-center">
                                  ...and {csvData.length - 10} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importResult && importResult.errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg bg-red-50 p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-2">
                        Import Errors ({importResult.errors.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto text-sm text-red-700">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx}>
                            Row {err.row} ({err.compoundCode}): {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowOpeningStockModal(false);
                        resetOpeningStockForm();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportOpeningStock}
                      disabled={isImporting || csvData.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isImporting ? "Importing..." : `Import ${csvData.length} Compounds`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
