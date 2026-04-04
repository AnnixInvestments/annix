"use client";

import { DollarSign, Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Pagination, TableLoadingState } from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import {
  type CalendererConversionRates,
  type CostRateDto,
  type CostRateType,
  type RollCosDto,
  type RubberProductCodingDto,
  rubberPortalApi,
} from "@/app/lib/api/rubberPortalApi";
import { formatDateZA } from "@/app/lib/datetime";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";

const ITEMS_PER_PAGE = 25;

type ActiveTab = "rates" | "profitability";

const RATE_TYPE_LABELS: Record<CostRateType, string> = {
  CALENDERER_UNCURED: "Calenderer – Uncured Rolls",
  CALENDERER_CURED_BUFFED: "Calenderer – Cured & Buffed Rolls",
  COMPOUND: "Compound Cost (S&N)",
};

function formatZar(value: number | null): string {
  if (value === null) return "—";
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AnomalyBadge(props: { anomalyZar: number | null }) {
  const value = props.anomalyZar;
  if (value === null) return <span className="text-gray-400">—</span>;
  const abs = Math.abs(value);
  if (abs < 0.01) return <span className="text-green-600 font-medium">None</span>;
  if (value > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        +{formatZar(value)} over
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {formatZar(value)} under
    </span>
  );
}

function ProfitBadge(props: { profitLossZar: number | null }) {
  const value = props.profitLossZar;
  if (value === null) return <span className="text-gray-400">—</span>;
  if (value >= 0) {
    return <span className="text-green-700 font-semibold">{formatZar(value)}</span>;
  }
  return <span className="text-red-700 font-semibold">{formatZar(value)}</span>;
}

export default function CostOfSalePage() {
  const { showToast } = useToast();
  const { colors } = useAuRubberBranding();
  const [activeTab, setActiveTab] = useState<ActiveTab>("rates");

  const [costRates, setCostRates] = useState<CostRateDto[]>([]);
  const [compounds, setCompounds] = useState<RubberProductCodingDto[]>([]);
  const [calendererRates, setCalendererRates] = useState<CalendererConversionRates>({
    uncuredPerKg: null,
    curedBuffedPerKg: null,
  });
  const [rollCosData, setRollCosData] = useState<RollCosDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRolls, setIsLoadingRolls] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showAddCompound, setShowAddCompound] = useState(false);
  const [addCompoundId, setAddCompoundId] = useState<number | null>(null);
  const [addCompoundCost, setAddCompoundCost] = useState("");
  const [addCompoundNotes, setAddCompoundNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [uncuredInput, setUncuredInput] = useState("");
  const [curedBuffedInput, setCuredBuffedInput] = useState("");
  const [isEditingCalenderer, setIsEditingCalenderer] = useState(false);

  const [rollPage, setRollPage] = useState(0);
  const [rollPageSize, setRollPageSize] = useState(ITEMS_PER_PAGE);
  const [rollFilter, setRollFilter] = useState<"ALL" | "IN_STOCK" | "SOLD">("ALL");

  const loadRates = useCallback(async () => {
    try {
      setIsLoading(true);
      const [rates, codings, calRates] = await Promise.all([
        rubberPortalApi.costRates(),
        rubberPortalApi.productCodings("COMPOUND"),
        rubberPortalApi.calendererConversionRates(),
      ]);
      setCostRates(rates);
      setCompounds(codings);
      setCalendererRates(calRates);
      setUncuredInput(calRates.uncuredPerKg !== null ? String(calRates.uncuredPerKg) : "");
      setCuredBuffedInput(
        calRates.curedBuffedPerKg !== null ? String(calRates.curedBuffedPerKg) : "",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load cost rates", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRollCos = useCallback(async () => {
    try {
      setIsLoadingRolls(true);
      const status = rollFilter === "ALL" ? undefined : rollFilter;
      const data = await rubberPortalApi.allRollCos(status);
      setRollCosData(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load roll COS data", "error");
    } finally {
      setIsLoadingRolls(false);
    }
  }, [rollFilter]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  useEffect(() => {
    if (activeTab === "profitability") {
      loadRollCos();
    }
  }, [activeTab, loadRollCos]);

  const compoundRates = costRates.filter((r) => r.rateType === "COMPOUND");

  const compoundsWithoutRates = compounds.filter(
    (c) => !compoundRates.some((r) => r.compoundCodingId === c.id),
  );

  const handleSaveCalendererRates = async () => {
    try {
      setIsSaving(true);

      const uncuredRate = costRates.find((r) => r.rateType === "CALENDERER_UNCURED");
      const curedRate = costRates.find((r) => r.rateType === "CALENDERER_CURED_BUFFED");

      const uncuredVal = parseFloat(uncuredInput);
      const curedVal = parseFloat(curedBuffedInput);

      if (uncuredInput && !Number.isNaN(uncuredVal)) {
        if (uncuredRate) {
          await rubberPortalApi.updateCostRate(uncuredRate.id, { costPerKgZar: uncuredVal });
        } else {
          await rubberPortalApi.createCostRate({
            rateType: "CALENDERER_UNCURED",
            costPerKgZar: uncuredVal,
          });
        }
      }

      if (curedBuffedInput && !Number.isNaN(curedVal)) {
        if (curedRate) {
          await rubberPortalApi.updateCostRate(curedRate.id, { costPerKgZar: curedVal });
        } else {
          await rubberPortalApi.createCostRate({
            rateType: "CALENDERER_CURED_BUFFED",
            costPerKgZar: curedVal,
          });
        }
      }

      showToast("Calenderer conversion rates saved", "success");
      setIsEditingCalenderer(false);
      await loadRates();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save rates", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCompoundRate = async () => {
    if (!addCompoundId || !addCompoundCost) return;
    try {
      setIsSaving(true);
      await rubberPortalApi.createCostRate({
        rateType: "COMPOUND",
        costPerKgZar: parseFloat(addCompoundCost),
        compoundCodingId: addCompoundId,
        notes: addCompoundNotes || null,
      });
      showToast("Compound cost rate added", "success");
      setShowAddCompound(false);
      setAddCompoundId(null);
      setAddCompoundCost("");
      setAddCompoundNotes("");
      await loadRates();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add compound rate", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRate = async (id: number) => {
    const val = parseFloat(editValue);
    if (Number.isNaN(val)) return;
    try {
      setIsSaving(true);
      await rubberPortalApi.updateCostRate(id, {
        costPerKgZar: val,
        notes: editNotes || null,
      });
      showToast("Cost rate updated", "success");
      setEditingId(null);
      await loadRates();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update rate", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRate = async () => {
    if (!deletingId) return;
    try {
      await rubberPortalApi.deleteCostRate(deletingId);
      showToast("Cost rate deleted", "success");
      setDeletingId(null);
      await loadRates();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete rate", "error");
    }
  };

  const effectiveRollPageSize = rollPageSize === 0 ? rollCosData.length : rollPageSize;
  const paginatedRolls = rollCosData.slice(
    rollPage * effectiveRollPageSize,
    (rollPage + 1) * effectiveRollPageSize,
  );

  const totalCosSum = rollCosData.reduce((sum, r) => sum + (r.totalCos || 0), 0);
  const totalRevenueSum = rollCosData.reduce((sum, r) => sum + (r.priceZar || 0), 0);
  const totalProfitSum = rollCosData.reduce((sum, r) => sum + (r.profitLossZar || 0), 0);
  const anomalyCount = rollCosData.filter(
    (r) => r.anomalyZar !== null && Math.abs(r.anomalyZar) >= 0.01,
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Cost of Sale" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost of Sale</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage cost rates and track profit/loss per roll
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "rates" as const, label: "Cost Rates" },
            { key: "profitability" as const, label: "Roll Profitability" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "rates" && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Calenderer Conversion Costs (Impilo)
                </h2>
                <p className="text-sm text-gray-500">
                  Cost per kg charged by the calenderer for converting compound into sheeting
                </p>
              </div>
              {!isEditingCalenderer && (
                <button
                  onClick={() => setIsEditingCalenderer(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
            <div className="p-6">
              {isLoading ? (
                <TableLoadingState
                  message="Loading rates..."
                  spinnerClassName="border-b-2 border-yellow-600"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Uncured Rolls (ZAR/kg)
                    </label>
                    {isEditingCalenderer ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={uncuredInput}
                        onChange={(e) => setUncuredInput(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-3 py-2"
                        placeholder="e.g. 12.50"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">
                        {calendererRates.uncuredPerKg !== null
                          ? formatZar(calendererRates.uncuredPerKg)
                          : "Not set"}
                        <span className="text-sm font-normal text-gray-500 ml-1">/kg</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cured & Buffed Rolls (ZAR/kg)
                    </label>
                    {isEditingCalenderer ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={curedBuffedInput}
                        onChange={(e) => setCuredBuffedInput(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-3 py-2"
                        placeholder="e.g. 18.00"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">
                        {calendererRates.curedBuffedPerKg !== null
                          ? formatZar(calendererRates.curedBuffedPerKg)
                          : "Not set"}
                        <span className="text-sm font-normal text-gray-500 ml-1">/kg</span>
                      </div>
                    )}
                  </div>
                  {isEditingCalenderer && (
                    <div className="col-span-2 flex items-center space-x-3">
                      <button
                        onClick={handleSaveCalendererRates}
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingCalenderer(false);
                          setUncuredInput(
                            calendererRates.uncuredPerKg !== null
                              ? String(calendererRates.uncuredPerKg)
                              : "",
                          );
                          setCuredBuffedInput(
                            calendererRates.curedBuffedPerKg !== null
                              ? String(calendererRates.curedBuffedPerKg)
                              : "",
                          );
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Compound Costs (S&N)</h2>
                <p className="text-sm text-gray-500">
                  Cost per kg of raw compound by compound code, as charged by the compounder
                </p>
              </div>
              <button
                onClick={() => setShowAddCompound(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Compound Cost
              </button>
            </div>
            <div className="overflow-x-auto">
              {isLoading ? (
                <TableLoadingState
                  message="Loading compound costs..."
                  spinnerClassName="border-b-2 border-yellow-600"
                />
              ) : compoundRates.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No compound costs configured yet. Add compound costs to calculate roll COS.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Compound Code",
                        "Compound Name",
                        "Cost/kg (ZAR)",
                        "Notes",
                        "Last Updated",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {compoundRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {rate.compoundCode || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {rate.compoundName || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingId === rate.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-28 border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-2 py-1"
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {formatZar(rate.costPerKgZar)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {editingId === rate.id ? (
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-2 py-1"
                              placeholder="Notes"
                            />
                          ) : (
                            rate.notes || "—"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateZA(rate.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingId === rate.id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUpdateRate(rate.id)}
                                disabled={isSaving}
                                className="text-green-600 hover:text-green-800"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingId(rate.id);
                                  setEditValue(String(rate.costPerKgZar));
                                  setEditNotes(rate.notes || "");
                                }}
                                className="text-yellow-600 hover:text-yellow-800"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(rate.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "profitability" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Total COS</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatZar(totalCosSum)}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatZar(totalRevenueSum)}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Profit/Loss</p>
              <p
                className={`mt-1 text-lg font-bold ${totalProfitSum >= 0 ? "text-green-700" : "text-red-700"}`}
              >
                {formatZar(totalProfitSum)}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">Anomalies</p>
              <p
                className={`mt-1 text-lg font-bold ${anomalyCount > 0 ? "text-orange-600" : "text-green-700"}`}
              >
                {anomalyCount}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Roll Profitability</h2>
              <div className="flex items-center space-x-3">
                <select
                  value={rollFilter}
                  onChange={(e) => {
                    setRollFilter(e.target.value as typeof rollFilter);
                    setRollPage(0);
                  }}
                  className="block w-36 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
                >
                  <option value="ALL">All Rolls</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="SOLD">Sold</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              {isLoadingRolls ? (
                <TableLoadingState
                  message="Calculating roll COS..."
                  spinnerClassName="border-b-2 border-yellow-600"
                />
              ) : rollCosData.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No roll stock data found
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          "Roll #",
                          "Compound",
                          "Weight (kg)",
                          "Compound Cost",
                          "Calenderer Cost",
                          "Total COS",
                          "Supplier Charged",
                          "Anomaly",
                          "Sale Price",
                          "Profit/Loss",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedRolls.map((roll) => (
                        <tr key={roll.rollId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {roll.rollNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {roll.compoundCode || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {roll.weightKg.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatZar(roll.compoundCostTotal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatZar(roll.calendererCostTotal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatZar(roll.totalCos)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatZar(roll.currentCostZar)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <AnomalyBadge anomalyZar={roll.anomalyZar} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {formatZar(roll.priceZar)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <ProfitBadge profitLossZar={roll.profitLossZar} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    totalItems={rollCosData.length}
                    currentPage={rollPage}
                    onPageChange={setRollPage}
                    itemsPerPage={rollPageSize}
                    itemName="rolls"
                    onPageSizeChange={(size) => {
                      setRollPageSize(size);
                      setRollPage(0);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddCompound && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/10 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Compound Cost Rate</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compound</label>
                <select
                  value={addCompoundId || ""}
                  onChange={(e) => setAddCompoundId(e.target.value ? Number(e.target.value) : null)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-3 py-2"
                >
                  <option value="">Select compound...</option>
                  {compoundsWithoutRates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost per kg (ZAR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addCompoundCost}
                  onChange={(e) => setAddCompoundCost(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-3 py-2"
                  placeholder="e.g. 45.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={addCompoundNotes}
                  onChange={(e) => setAddCompoundNotes(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm border px-3 py-2"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddCompound(false);
                  setAddCompoundId(null);
                  setAddCompoundCost("");
                  setAddCompoundNotes("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompoundRate}
                disabled={isSaving || !addCompoundId || !addCompoundCost}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {isSaving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId !== null && (
        <ConfirmModal
          isOpen={true}
          title="Delete Cost Rate"
          message="Are you sure you want to delete this cost rate? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteRate}
          onCancel={() => setDeletingId(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
