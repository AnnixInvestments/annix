"use client";

import { isUndefined } from "es-toolkit/compat";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import {
  PriceListImportModeSelect,
  priceListImportResultMessage,
} from "@/app/components/shared/PriceListImportMode";
import { useToast } from "@/app/components/Toast";
import { metricsApi } from "@/app/lib/api/metricsApi";
import type {
  CreateRubberBondingAgentInput,
  PriceListImportMode,
  RubberBondingAgentImportPreview,
  RubberBondingAgentRow,
  RubberBondingCoverageBasis,
} from "@/app/lib/api/stockControlApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useCommitRubberBondingAgentImport,
  useCreateRubberBondingAgent,
  useDeleteRubberBondingAgent,
  useEnrichRubberBondingCoverage,
  useImportRubberBondingAgents,
  useRubberBondingAgents,
  useSeedRubberBondingAgents,
  useUpdateRubberBondingAgent,
} from "@/app/lib/query/hooks";

const IMPORT_FALLBACK_MS = 60000;

const INPUT_CLASS =
  "w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500";

const TH_CLASS =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap";

const TD_CLASS = "px-3 py-2 text-sm text-gray-700 whitespace-nowrap";

interface AgentDraft {
  supplier: string;
  name: string;
  packSizeLitres: string;
  pricePerTin: string;
  pricePerLitre: string;
  areaCoverPerLitre: string;
  coverageBasis: string;
  gramsPerM2: string;
}

const EMPTY_DRAFT: AgentDraft = {
  supplier: "",
  name: "",
  packSizeLitres: "",
  pricePerTin: "",
  pricePerLitre: "",
  areaCoverPerLitre: "",
  coverageBasis: "litre",
  gramsPerM2: "",
};

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function money(value: number): string {
  return value.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  });
}

function decimal(value: number, places: number): string {
  return value.toLocaleString("en-ZA", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

function draftFromRow(row: RubberBondingAgentRow): AgentDraft {
  const agent = row.agent;
  const supplier = agent.supplier;
  const packSizeLitres = agent.packSizeLitres;
  const pricePerTin = agent.pricePerTin;
  const pricePerLitre = agent.pricePerLitre;
  const areaCoverPerLitre = agent.areaCoverPerLitre;
  const coverageBasis = agent.coverageBasis;
  const gramsPerM2 = agent.gramsPerM2;
  return {
    supplier: supplier ?? "",
    name: agent.name,
    packSizeLitres: packSizeLitres === null ? "" : String(packSizeLitres),
    pricePerTin: pricePerTin === null ? "" : String(pricePerTin),
    pricePerLitre: pricePerLitre === null ? "" : String(pricePerLitre),
    areaCoverPerLitre: areaCoverPerLitre === null ? "" : String(areaCoverPerLitre),
    coverageBasis: coverageBasis ?? "litre",
    gramsPerM2: gramsPerM2 === null ? "" : String(gramsPerM2),
  };
}

function draftToInput(draft: AgentDraft): CreateRubberBondingAgentInput {
  const basis = draft.coverageBasis;
  const coverageBasis: RubberBondingCoverageBasis =
    basis === "gram" ? "gram" : basis === "none" ? "none" : "litre";
  return {
    supplier: textOrNull(draft.supplier),
    name: draft.name.trim(),
    packSizeLitres: numberOrNull(draft.packSizeLitres),
    pricePerTin: numberOrNull(draft.pricePerTin),
    pricePerLitre: numberOrNull(draft.pricePerLitre),
    areaCoverPerLitre: coverageBasis === "litre" ? numberOrNull(draft.areaCoverPerLitre) : null,
    coverageBasis,
    gramsPerM2: coverageBasis === "gram" ? numberOrNull(draft.gramsPerM2) : null,
  };
}

function draftIsValid(draft: AgentDraft): boolean {
  return draft.name.trim() !== "";
}

interface CoverageEditorProps {
  draft: AgentDraft;
  onBasisChange: (value: string) => void;
  onAreaCoverChange: (value: string) => void;
  onGramsPerM2Change: (value: string) => void;
}

function CoverageEditor(props: CoverageEditorProps) {
  const draft = props.draft;
  const basis = draft.coverageBasis;
  return (
    <div className="flex flex-col gap-1">
      <select
        value={basis}
        onChange={(e) => props.onBasisChange(e.target.value)}
        aria-label="Coverage basis"
        className={`${INPUT_CLASS} w-28`}
      >
        <option value="litre">Litre (m²/L)</option>
        <option value="gram">Kg (g/m²)</option>
        <option value="none">Per unit</option>
      </select>
      {basis === "gram" && (
        <input
          type="number"
          step="0.01"
          value={draft.gramsPerM2}
          placeholder="g/m²"
          aria-label="Grams per square metre"
          onChange={(e) => props.onGramsPerM2Change(e.target.value)}
          className={`${INPUT_CLASS} w-28`}
        />
      )}
      {basis === "litre" && (
        <input
          type="number"
          step="0.01"
          value={draft.areaCoverPerLitre}
          placeholder="m²/L"
          aria-label="Spread rate in square metres per litre"
          onChange={(e) => props.onAreaCoverChange(e.target.value)}
          className={`${INPUT_CLASS} w-28`}
        />
      )}
      {basis === "none" && <span className="text-xs text-gray-400">No coverage</span>}
    </div>
  );
}

interface BondingAgentsCardProps {
  accentColor: string;
}

export function BondingAgentsCard(props: BondingAgentsCardProps) {
  const accentColor = props.accentColor;
  const query = useRubberBondingAgents();
  const createAgent = useCreateRubberBondingAgent();
  const updateAgent = useUpdateRubberBondingAgent();
  const deleteAgent = useDeleteRubberBondingAgent();
  const seedAgents = useSeedRubberBondingAgents();
  const enrichCoverage = useEnrichRubberBondingCoverage();
  const importAgents = useImportRubberBondingAgents();
  const commitImport = useCommitRubberBondingAgentImport();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showExtraction, hideExtraction } = useExtractionProgress();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<AgentDraft>(EMPTY_DRAFT);
  const [newDraft, setNewDraft] = useState<AgentDraft>(EMPTY_DRAFT);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [importSupplier, setImportSupplier] = useState("");
  const [importPreview, setImportPreview] = useState<RubberBondingAgentImportPreview | null>(null);
  const [importMode, setImportMode] = useState<PriceListImportMode>("update");

  const data = query.data;
  const rows = data ? data.agents : [];
  const hasRows = rows.length > 0;

  const supplierOptions = Array.from(
    new Set(rows.map((row) => row.agent.supplier).filter((name): name is string => name != null)),
  ).sort((a, b) => a.localeCompare(b));

  const filteredRows = rows.filter((row) => {
    const supplier = row.agent.supplier;
    return supplierFilter === "all" || supplier === supplierFilter;
  });

  const seedPending = seedAgents.isPending;
  const enrichPending = enrichCoverage.isPending;
  const importPending = importAgents.isPending;

  const setRowField = useCallback((field: keyof AgentDraft, value: string) => {
    setRowDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNewField = useCallback((field: keyof AgentDraft, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const startEdit = useCallback((row: RubberBondingAgentRow) => {
    setEditingId(row.agent.id);
    setRowDraft(draftFromRow(row));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setRowDraft(EMPTY_DRAFT);
  }, []);

  const handleSaveEdit = useCallback(
    (id: number) => {
      if (!draftIsValid(rowDraft)) {
        showToast("Name is required.", "warning");
        return;
      }
      updateAgent.mutate(
        { id, input: draftToInput(rowDraft) },
        {
          onSuccess: () => {
            showToast("Bonding agent updated.", "success");
            setEditingId(null);
            setRowDraft(EMPTY_DRAFT);
          },
          onError: () => showToast("Could not update bonding agent — please try again.", "error"),
        },
      );
    },
    [rowDraft, updateAgent, showToast],
  );

  const handleAdd = useCallback(() => {
    if (!draftIsValid(newDraft)) {
      showToast("Name is required.", "warning");
      return;
    }
    createAgent.mutate(draftToInput(newDraft), {
      onSuccess: () => {
        showToast("Bonding agent added.", "success");
        setNewDraft(EMPTY_DRAFT);
      },
      onError: () => showToast("Could not add bonding agent — please try again.", "error"),
    });
  }, [newDraft, createAgent, showToast]);

  const handleDelete = useCallback(
    async (row: RubberBondingAgentRow) => {
      const agent = row.agent;
      const confirmed = await confirm({
        title: "Delete bonding agent",
        message: `Remove "${agent.name}" from the bonding agents list? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) return;
      deleteAgent.mutate(agent.id, {
        onSuccess: () => showToast("Bonding agent deleted.", "success"),
        onError: () => showToast("Could not delete bonding agent — please try again.", "error"),
      });
    },
    [confirm, deleteAgent, showToast],
  );

  const handleSeed = useCallback(async () => {
    const confirmed = await confirm({
      title: "Seed bonding agents",
      message:
        "Backfill the bonding agents list from product data? This only runs when the list is empty.",
      confirmLabel: "Seed",
      variant: "info",
    });
    if (!confirmed) return;
    seedAgents.mutate(undefined, {
      onSuccess: (result) => {
        const seeded = result.seeded;
        if (seeded > 0) {
          showToast(`Seeded ${seeded} bonding agent${seeded === 1 ? "" : "s"}.`, "success");
        } else {
          showToast("The list already has bonding agents — nothing was seeded.", "info");
        }
      },
      onError: () => showToast("Could not seed bonding agents — please try again.", "error"),
    });
  }, [confirm, seedAgents, showToast]);

  const handleEnrichCoverage = useCallback(() => {
    enrichCoverage.mutate(undefined, {
      onSuccess: (result) => {
        const enriched = result.enriched;
        const checked = result.checked;
        if (enriched > 0) {
          showToast(
            `Filled coverage for ${enriched} bonding agent${enriched === 1 ? "" : "s"} from datasheets.`,
            "success",
          );
        } else if (checked === 0) {
          showToast("All bonding agents already have coverage.", "info");
        } else {
          showToast(
            "No datasheet match for the bonding agents missing coverage — enter those manually.",
            "info",
          );
        }
      },
      onError: () => showToast("Could not fill coverage — please try again.", "error"),
    });
  }, [enrichCoverage, showToast]);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const stats = await metricsApi
          .extractionStats("stock-control-rubber-bonding", "import")
          .catch(() => null);
        const learnedMs = stats == null ? null : stats.averageMs;
        const estimatedDurationMs =
          learnedMs == null || learnedMs <= 0 ? IMPORT_FALLBACK_MS : learnedMs;
        showExtraction({
          brand: "stock-control",
          label: "Reading price list…",
          estimatedDurationMs,
          backgroundSafe: true,
        });
        const preview = await importAgents.mutateAsync(file);
        const detectedSupplier = preview.supplier;
        setImportPreview(preview);
        setImportSupplier(detectedSupplier ?? "");
        setImportMode("update");
      } catch {
        showToast("Could not read that price list — please try a clearer file.", "error");
      } finally {
        hideExtraction();
      }
    },
    [importAgents, showExtraction, hideExtraction, showToast],
  );

  const handleImportInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      const file = files ? files[0] : null;
      event.target.value = "";
      if (file) {
        void handleImportFile(file);
      }
    },
    [handleImportFile],
  );

  const handleConfirmImport = useCallback(() => {
    const preview = importPreview;
    if (!preview) return;
    const supplier = importSupplier.trim();
    if (supplier === "") {
      showToast("Enter a supplier name for the imported bonding agents.", "warning");
      return;
    }
    const mode = importMode;
    commitImport.mutate(
      { supplier, replaceSupplier: mode === "replace", mode, rows: preview.rows },
      {
        onSuccess: (result) => {
          showToast(priceListImportResultMessage(result, "bonding agents"), "success");
          setImportPreview(null);
        },
        onError: () => showToast("Could not import the price list — please try again.", "error"),
      },
    );
  }, [importPreview, importSupplier, importMode, commitImport, showToast]);

  const queryIsLoading = query.isLoading;
  const queryIsError = query.isError;
  const previewRows = importPreview ? importPreview.rows : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bonding agents</h2>
          <p className="text-sm text-gray-500 mt-1">
            Bonding agents / adhesives. Coverage (m²/L for litre basis, g/m² for kg-kit basis)
            drives cost/m². Sale/m² = cost × consumable markup. Upload a supplier price list to
            populate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportInputChange}
          />
          <button
            type="button"
            onClick={handleSeed}
            disabled={seedPending || hasRows}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {seedPending ? "Seeding…" : "Seed from product data"}
          </button>
          <button
            type="button"
            onClick={handleEnrichCoverage}
            disabled={enrichPending || !hasRows}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {enrichPending ? "Filling…" : "Fill coverage from datasheets"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importPending}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-teal-50 disabled:opacity-50"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            {importPending ? "Reading…" : "Upload supplier price list"}
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium whitespace-nowrap">Supplier</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            aria-label="Filter bonding agents by supplier"
            className={`${INPUT_CLASS} w-48`}
          >
            <option value="all">All suppliers</option>
            {supplierOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {queryIsLoading && (
        <div className="p-8 text-center text-sm text-gray-500">Loading bonding agents…</div>
      )}

      {queryIsError && (
        <div className="p-8 text-center text-sm text-gray-500">
          Could not load bonding agents — please try again.
        </div>
      )}

      {!queryIsLoading && !queryIsError && (
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH_CLASS}>Supplier</th>
                <th className={TH_CLASS}>Name</th>
                <th className={TH_CLASS}>Pack size (L)</th>
                <th className={TH_CLASS}>Price/tin</th>
                <th className={TH_CLASS}>Price/L</th>
                <th className={TH_CLASS}>Coverage</th>
                <th className={TH_CLASS}>Cost/m²</th>
                <th className={TH_CLASS}>Sale/m²</th>
                <th className={TH_CLASS}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const agent = row.agent;
                const pricing = row.pricing;
                const isEditing = editingId === agent.id;
                const costPerM2 = pricing.costPerM2;
                const salePerM2 = pricing.salePerM2;
                if (isEditing) {
                  return (
                    <tr key={agent.id} className="bg-teal-50/40">
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.supplier}
                          onChange={(e) => setRowField("supplier", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="text"
                          value={rowDraft.name}
                          onChange={(e) => setRowField("name", e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.packSizeLitres}
                          onChange={(e) => setRowField("packSizeLitres", e.target.value)}
                          className={`${INPUT_CLASS} w-24`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.pricePerTin}
                          onChange={(e) => setRowField("pricePerTin", e.target.value)}
                          className={`${INPUT_CLASS} w-24`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <input
                          type="number"
                          step="0.01"
                          value={rowDraft.pricePerLitre}
                          onChange={(e) => setRowField("pricePerLitre", e.target.value)}
                          className={`${INPUT_CLASS} w-24`}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <CoverageEditor
                          draft={rowDraft}
                          onBasisChange={(value) => setRowField("coverageBasis", value)}
                          onAreaCoverChange={(value) => setRowField("areaCoverPerLitre", value)}
                          onGramsPerM2Change={(value) => setRowField("gramsPerM2", value)}
                        />
                      </td>
                      <td className={TD_CLASS}>{costPerM2 === null ? "—" : money(costPerM2)}</td>
                      <td className={TD_CLASS}>{salePerM2 === null ? "—" : money(salePerM2)}</td>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(agent.id)}
                            disabled={updateAgent.isPending}
                            className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const supplier = agent.supplier;
                const packSizeLitres = agent.packSizeLitres;
                const pricePerTin = agent.pricePerTin;
                const pricePerLitre = pricing.pricePerLitre;
                const areaCoverPerLitre = agent.areaCoverPerLitre;
                const coverageBasis = agent.coverageBasis;
                const gramsPerM2 = agent.gramsPerM2;
                const isGram = coverageBasis === "gram";
                const isNone = coverageBasis === "none";
                const packUnit = isGram ? "kg" : "L";
                const packSizeDisplay =
                  packSizeLitres === null ? "—" : `${decimal(packSizeLitres, 2)} ${packUnit}`;
                const coverageDisplay = isNone
                  ? "Per unit"
                  : isGram
                    ? gramsPerM2 === null
                      ? "—"
                      : `${decimal(gramsPerM2, 0)} g/m²`
                    : areaCoverPerLitre === null
                      ? "—"
                      : `${decimal(areaCoverPerLitre, 2)} m²/L`;
                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className={`${TD_CLASS} font-medium text-gray-900`}>{supplier ?? "—"}</td>
                    <td className={TD_CLASS}>{agent.name}</td>
                    <td className={TD_CLASS}>{packSizeDisplay}</td>
                    <td className={TD_CLASS}>{pricePerTin === null ? "—" : money(pricePerTin)}</td>
                    <td className={TD_CLASS}>
                      {pricePerLitre === null ? "—" : money(pricePerLitre)}
                    </td>
                    <td className={TD_CLASS}>{coverageDisplay}</td>
                    <td className={TD_CLASS}>
                      {isNone || costPerM2 === null ? "—" : money(costPerM2)}
                    </td>
                    <td className={`${TD_CLASS} font-semibold text-gray-900`}>
                      {isNone || salePerM2 === null ? "—" : money(salePerM2)}
                    </td>
                    <td className={TD_CLASS}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-sm font-medium text-teal-700 hover:text-teal-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deleteAgent.isPending}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50">
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.supplier}
                    placeholder="Supplier"
                    onChange={(e) => setNewField("supplier", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="text"
                    value={newDraft.name}
                    placeholder="Name"
                    onChange={(e) => setNewField("name", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.packSizeLitres}
                    onChange={(e) => setNewField("packSizeLitres", e.target.value)}
                    className={`${INPUT_CLASS} w-24`}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.pricePerTin}
                    onChange={(e) => setNewField("pricePerTin", e.target.value)}
                    className={`${INPUT_CLASS} w-24`}
                  />
                </td>
                <td className={TD_CLASS}>
                  <input
                    type="number"
                    step="0.01"
                    value={newDraft.pricePerLitre}
                    onChange={(e) => setNewField("pricePerLitre", e.target.value)}
                    className={`${INPUT_CLASS} w-24`}
                  />
                </td>
                <td className={TD_CLASS}>
                  <CoverageEditor
                    draft={newDraft}
                    onBasisChange={(value) => setNewField("coverageBasis", value)}
                    onAreaCoverChange={(value) => setNewField("areaCoverPerLitre", value)}
                    onGramsPerM2Change={(value) => setNewField("gramsPerM2", value)}
                  />
                </td>
                <td className={TD_CLASS}>—</td>
                <td className={TD_CLASS}>—</td>
                <td className={TD_CLASS}>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={createAgent.isPending}
                    className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
                  >
                    Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {importPreview && (
        <BondingAgentImportModal
          supplier={importSupplier}
          onSupplierChange={setImportSupplier}
          rowCount={previewRows.length}
          mode={importMode}
          onModeChange={setImportMode}
          onCancel={() => setImportPreview(null)}
          onConfirm={handleConfirmImport}
          committing={commitImport.isPending}
          accentColor={accentColor}
          rows={previewRows}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

interface BondingAgentImportModalProps {
  supplier: string;
  onSupplierChange: (value: string) => void;
  rowCount: number;
  mode: PriceListImportMode;
  onModeChange: (value: PriceListImportMode) => void;
  onCancel: () => void;
  onConfirm: () => void;
  committing: boolean;
  accentColor: string;
  rows: RubberBondingAgentImportPreview["rows"];
}

function BondingAgentImportModal(props: BondingAgentImportModalProps) {
  const rows = props.rows;
  const accentColor = props.accentColor;
  const committing = props.committing;
  const supplier = props.supplier;
  const hasNoRows = rows.length === 0;
  if (isUndefined(globalThis.document)) {
    return null;
  }
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Review imported bonding agents</h2>
          <p className="text-sm text-gray-500 mt-1">
            {props.rowCount} bonding agent{props.rowCount === 1 ? "" : "s"} read.
          </p>
        </div>
        <div className="p-5 overflow-auto flex-1 space-y-4">
          <label className="block text-sm text-gray-700">
            <span className="font-medium">Supplier</span>
            <input
              type="text"
              value={supplier}
              placeholder="Supplier name"
              onChange={(e) => props.onSupplierChange(e.target.value)}
              className={`${INPUT_CLASS} mt-1`}
            />
          </label>
          <PriceListImportModeSelect
            value={props.mode}
            onChange={props.onModeChange}
            itemNoun="bonding agents"
          />
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH_CLASS}>Name</th>
                <th className={TH_CLASS}>Pack size</th>
                <th className={TH_CLASS}>Price/tin</th>
                <th className={TH_CLASS}>Price/L</th>
                <th className={TH_CLASS}>Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => {
                const packSizeLitres = row.packSizeLitres;
                const pricePerTin = row.pricePerTin;
                const pricePerLitre = row.pricePerLitre;
                const areaCoverPerLitre = row.areaCoverPerLitre;
                const coverageBasis = row.coverageBasis;
                const gramsPerM2 = row.gramsPerM2;
                const isGram = coverageBasis === "gram";
                const isNone = coverageBasis === "none";
                const packUnit = isGram ? "kg" : "L";
                const packSizeDisplay =
                  packSizeLitres === null ? "—" : `${decimal(packSizeLitres, 2)} ${packUnit}`;
                const coverageDisplay = isNone
                  ? "Per unit"
                  : isGram
                    ? gramsPerM2 === null
                      ? "—"
                      : `${decimal(gramsPerM2, 0)} g/m²`
                    : areaCoverPerLitre === null
                      ? "—"
                      : `${decimal(areaCoverPerLitre, 2)} m²/L`;
                return (
                  <tr key={`${row.name}-${index}`}>
                    <td className={TD_CLASS}>{row.name}</td>
                    <td className={TD_CLASS}>{packSizeDisplay}</td>
                    <td className={TD_CLASS}>{pricePerTin === null ? "—" : money(pricePerTin)}</td>
                    <td className={TD_CLASS}>
                      {pricePerLitre === null ? "—" : money(pricePerLitre)}
                    </td>
                    <td className={TD_CLASS}>{coverageDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={committing || hasNoRows}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {committing ? "Importing…" : "Import bonding agents"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
