"use client";

import { keys } from "es-toolkit/compat";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TargetSelection } from "../components/JobCardOrCpoPicker";
import { JobCardOrCpoPicker } from "../components/JobCardOrCpoPicker";
import type { CpoChildJc, CpoLineItem, SelectedProductSpec } from "../hooks/useCpoContext";
import { specMatchesCoat } from "../hooks/useCpoContext";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

interface SingleJcProps {
  targetKind: "cpo" | "job_card" | null;
  targetId: number | null;
}

export interface IssueStockTargetStepProps {
  target: TargetSelection | null;
  setTarget: (t: TargetSelection | null) => void;
  onNext: () => void;
  cpoChildJcs: CpoChildJc[];
  selectedCpoJcIds: number[];
  setSelectedCpoJcIds: (ids: number[]) => void;
  selectedLineItemIds: number[];
  setSelectedLineItemIds: (ids: number[]) => void;
  lineItemIssueQty: Record<number, number>;
  setLineItemIssueQty: (qty: Record<number, number>) => void;
  expandedJcIds: number[];
  setExpandedJcIds: (ids: number[]) => void;
  cpoJcLoading: boolean;
  cpoIssuedTotals: Array<{
    productId: number;
    productName: string;
    rowType: string;
    totalIssued: number;
  }>;
  cpoPerJcIssued: Record<string, Record<number, number>>;
  derivedCoatStatusMap: Record<number, Record<string, number>>;
  selectedCoatsSummary: {
    selectedM2: number;
    paints: Array<{
      product: string;
      litres: number;
      role: string | null;
      minDftUm: number | null;
      maxDftUm: number | null;
      genericType: string | null;
    }>;
    selectedJcCount: number;
  };
  availableProductSpecs: Array<
    | { kind: "paint"; product: string; role: string | null; totalLitres: number }
    | { kind: "rubber"; specLabel: string }
  >;
  selectedProductSpec: SelectedProductSpec;
  setSelectedProductSpec: (spec: SelectedProductSpec) => void;
  cpoCoatingSpecs: string | null;
  setCart: (cart: never[]) => void;
  setSearch: (s: string) => void;
  setPendingAllocQty: (q: number | null) => void;
  setPendingCoatType: (ct: "primer" | "intermediate" | "final" | "rubber_lining" | null) => void;
}

export function IssueStockTargetStep(props: IssueStockTargetStepProps) {
  const {
    target,
    setTarget,
    onNext,
    cpoChildJcs,
    selectedCpoJcIds,
    setSelectedCpoJcIds,
    selectedLineItemIds,
    setSelectedLineItemIds,
    lineItemIssueQty,
    setLineItemIssueQty,
    expandedJcIds,
    setExpandedJcIds,
    cpoJcLoading,
    cpoIssuedTotals,
    cpoPerJcIssued,
    derivedCoatStatusMap,
    selectedCoatsSummary,
    availableProductSpecs,
    selectedProductSpec,
    setSelectedProductSpec,
    cpoCoatingSpecs,
    setCart,
    setSearch,
    setPendingAllocQty,
    setPendingCoatType,
  } = props;

  const config = useStockManagementConfig();
  const targetKind = target == null ? null : target.kind;
  const targetId = target == null ? null : target.id;
  const authHeaders = config.authHeaders;
  const authHeadersRef = useRef(authHeaders);
  authHeadersRef.current = authHeaders;

  const [singleJcData, setSingleJcData] = useState<CpoChildJc | null>(null);
  const [singleJcLoading, setSingleJcLoading] = useState(false);
  const [singleJcExpanded, setSingleJcExpanded] = useState(false);
  const [singleJcSelectedItems, setSingleJcSelectedItems] = useState<number[]>([]);
  const jcDetailCache = useMemo(() => new Map<number, CpoChildJc>(), []);

  useEffect(() => {
    if (targetKind !== "job_card" || targetId == null) {
      setSingleJcData(null);
      setSingleJcSelectedItems([]);
      setSingleJcExpanded(false);
      return;
    }
    const cached = jcDetailCache.get(targetId);
    if (cached) {
      setSingleJcData(cached);
      setSingleJcSelectedItems(cached.lineItems.map((li) => li.id));
      setSingleJcExpanded(false);
      return;
    }
    let cancelled = false;
    setSingleJcLoading(true);
    fetch(`/api/stock-control/job-cards/${targetId}`, {
      headers: authHeadersRef.current(),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(
        (data: {
          id: number;
          jobNumber: string;
          jcNumber?: string | null;
          jobName?: string | null;
          workflowStatus?: string | null;
          lineItems?: CpoLineItem[];
          extM2?: number;
          intM2?: number;
        }) => {
          if (cancelled) return;
          const items = data.lineItems == null ? [] : data.lineItems;
          const extM2 = data.extM2 == null ? 0 : data.extM2;
          const intM2 = data.intM2 == null ? 0 : data.intM2;
          const jc: CpoChildJc = {
            id: data.id,
            jobNumber: data.jobNumber,
            jcNumber: data.jcNumber == null ? null : data.jcNumber,
            jobName: data.jobName == null ? null : data.jobName,
            status: data.workflowStatus == null ? null : data.workflowStatus,
            extM2,
            intM2,
            totalAreaM2: extM2 + intM2,
            lineItems: items,
            lineItemCount: items.length,
            coats: [],
            hasInternalLining: false,
          };
          jcDetailCache.set(targetId, jc);
          setSingleJcData(jc);
          setSingleJcSelectedItems(items.map((li) => li.id));
        },
      )
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Failed to load JC ${targetId}: ${message}`);
        setSingleJcData(null);
      })
      .finally(() => {
        if (!cancelled) setSingleJcLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetKind, targetId, jcDetailCache]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Job Card or CPO</h2>
      <p className="text-xs text-gray-500">
        Optional. Pick a job card or a CPO to link this issuance to, or skip to continue without
        one.
      </p>
      <JobCardOrCpoPicker value={target} onChange={setTarget} />

      {targetKind === "job_card" && singleJcLoading ? (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          Loading job card details...
        </div>
      ) : null}

      {targetKind === "job_card" && !singleJcLoading && singleJcData != null ? (
        <SingleJcPanel
          singleJcData={singleJcData}
          singleJcExpanded={singleJcExpanded}
          setSingleJcExpanded={setSingleJcExpanded}
          singleJcSelectedItems={singleJcSelectedItems}
          setSingleJcSelectedItems={setSingleJcSelectedItems}
        />
      ) : null}

      {targetKind === "cpo" && cpoJcLoading ? (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          Loading job cards for this CPO...
        </div>
      ) : null}

      {targetKind === "cpo" &&
      !cpoJcLoading &&
      cpoChildJcs.length > 0 &&
      availableProductSpecs.length > 0 ? (
        <ProductSpecSelector
          availableProductSpecs={availableProductSpecs}
          selectedProductSpec={selectedProductSpec}
          setSelectedProductSpec={setSelectedProductSpec}
          setCart={setCart}
          setSearch={setSearch}
          setPendingAllocQty={setPendingAllocQty}
          setPendingCoatType={setPendingCoatType}
        />
      ) : null}

      {targetKind === "cpo" && !cpoJcLoading && cpoChildJcs.length > 0 ? (
        <CpoJobCardList
          cpoChildJcs={cpoChildJcs}
          selectedCpoJcIds={selectedCpoJcIds}
          setSelectedCpoJcIds={setSelectedCpoJcIds}
          selectedLineItemIds={selectedLineItemIds}
          setSelectedLineItemIds={setSelectedLineItemIds}
          lineItemIssueQty={lineItemIssueQty}
          setLineItemIssueQty={setLineItemIssueQty}
          expandedJcIds={expandedJcIds}
          setExpandedJcIds={setExpandedJcIds}
          derivedCoatStatusMap={derivedCoatStatusMap}
          selectedProductSpec={selectedProductSpec}
          cpoIssuedTotals={cpoIssuedTotals}
          cpoPerJcIssued={cpoPerJcIssued}
          cpoCoatingSpecs={cpoCoatingSpecs}
        />
      ) : null}

      {targetKind === "cpo" && !cpoJcLoading && cpoChildJcs.length === 0 && target != null ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No job cards found for this CPO.
        </div>
      ) : null}

      {targetKind === "cpo" && !cpoJcLoading && cpoChildJcs.length > 0 ? (
        <div className="rounded border border-gray-200 bg-white p-3 space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Selection Summary — {selectedCoatsSummary.selectedJcCount}/{cpoChildJcs.length} JCs ·{" "}
            {selectedCoatsSummary.selectedM2.toFixed(1)} m²
          </h3>

          {selectedCoatsSummary.paints.length > 0 ? (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Paint Requirements</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {selectedCoatsSummary.paints.map((p) => {
                  const roleLabel = p.role == null ? "" : ` (${p.role})`;
                  const pMinDft = p.minDftUm;
                  const pMaxDft = p.maxDftUm;
                  const pGeneric = p.genericType;
                  const dftLabel =
                    pMinDft != null && pMaxDft != null
                      ? `${pMinDft}\u2013${pMaxDft} \u00b5m`
                      : null;
                  return (
                    <div
                      key={p.product}
                      className="flex flex-col rounded bg-blue-50 px-2 py-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-blue-900 truncate flex-1">
                          {p.product}
                          {roleLabel}
                        </span>
                        <span className="text-blue-700 font-mono font-semibold shrink-0 ml-2">
                          {p.litres.toFixed(1)} L
                        </span>
                      </div>
                      {dftLabel != null || pGeneric != null ? (
                        <div className="flex gap-2 text-[10px] text-blue-600 mt-0.5">
                          {pGeneric != null ? <span>{pGeneric.replace(/_/g, " ")}</span> : null}
                          {dftLabel != null ? <span>DFT: {dftLabel}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">No paint specifications on selected JCs</div>
          )}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onNext}
          disabled={
            (targetKind === "cpo" && cpoChildJcs.length > 0 && selectedCpoJcIds.length === 0) ||
            (targetKind === "cpo" &&
              availableProductSpecs.length > 0 &&
              selectedProductSpec == null)
          }
          className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          Next →
        </button>
        {target != null ? (
          <button
            type="button"
            onClick={() => {
              setTarget(null);
              onNext();
            }}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
          >
            Skip (clear selection)
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SingleJcPanel(props: {
  singleJcData: CpoChildJc;
  singleJcExpanded: boolean;
  setSingleJcExpanded: (v: boolean) => void;
  singleJcSelectedItems: number[];
  setSingleJcSelectedItems: (ids: number[]) => void;
}) {
  const {
    singleJcData,
    singleJcExpanded,
    setSingleJcExpanded,
    singleJcSelectedItems,
    setSingleJcSelectedItems,
  } = props;

  return (
    <div className="rounded border border-teal-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setSingleJcExpanded(!singleJcExpanded)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-teal-600 transition-transform ${singleJcExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-teal-900">
            Line Items ({singleJcData.lineItems.length})
          </span>
          {singleJcData.totalAreaM2 > 0 ? (
            <span className="text-xs text-teal-700">{singleJcData.totalAreaM2.toFixed(1)} m²</span>
          ) : null}
          <span className="text-[10px] text-gray-400">
            {singleJcSelectedItems.length}/{singleJcData.lineItems.length} selected
          </span>
        </button>
        {singleJcData.lineItems.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const allSelected = singleJcSelectedItems.length === singleJcData.lineItems.length;
              setSingleJcSelectedItems(
                allSelected ? [] : singleJcData.lineItems.map((li) => li.id),
              );
            }}
            className="text-xs text-teal-700 hover:underline shrink-0"
          >
            {singleJcSelectedItems.length === singleJcData.lineItems.length
              ? "Deselect all"
              : "Select all"}
          </button>
        ) : null}
      </div>

      {singleJcExpanded && singleJcData.lineItems.length > 0 ? (
        <div className="border-t border-teal-100 bg-gray-50 px-3 py-2 space-y-1">
          {singleJcData.lineItems.map((li) => {
            const liSelected = singleJcSelectedItems.includes(li.id);
            const itemLabel =
              li.itemDescription == null
                ? li.itemCode == null
                  ? `Item #${li.id}`
                  : li.itemCode
                : li.itemDescription;
            const itemNo = li.itemNo;
            const jtNo = li.jtNo;
            const liM2 = li.m2;
            return (
              <label
                key={li.id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={liSelected}
                  onChange={() => {
                    setSingleJcSelectedItems(
                      liSelected
                        ? singleJcSelectedItems.filter((id) => id !== li.id)
                        : [...singleJcSelectedItems, li.id],
                    );
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                {itemNo != null ? (
                  <span className="font-mono text-gray-500 shrink-0">{itemNo}</span>
                ) : null}
                <span className="text-gray-800 truncate flex-1">{itemLabel}</span>
                {jtNo != null ? <span className="text-gray-400 shrink-0">JT {jtNo}</span> : null}
                {liM2 != null && liM2 > 0 ? (
                  <span className="text-teal-700 shrink-0">{liM2.toFixed(1)} m²</span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}

      {singleJcExpanded && singleJcData.lineItems.length === 0 ? (
        <div className="border-t border-teal-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">
          No line items on this job card
        </div>
      ) : null}
    </div>
  );
}

function ProductSpecSelector(props: {
  availableProductSpecs: Array<
    | { kind: "paint"; product: string; role: string | null; totalLitres: number }
    | { kind: "rubber"; specLabel: string }
  >;
  selectedProductSpec: SelectedProductSpec;
  setSelectedProductSpec: (spec: SelectedProductSpec) => void;
  setCart: (cart: never[]) => void;
  setSearch: (s: string) => void;
  setPendingAllocQty: (q: number | null) => void;
  setPendingCoatType: (ct: "primer" | "intermediate" | "final" | "rubber_lining" | null) => void;
}) {
  const {
    availableProductSpecs,
    selectedProductSpec,
    setSelectedProductSpec,
    setCart,
    setSearch,
    setPendingAllocQty,
    setPendingCoatType,
  } = props;

  return (
    <div className="rounded border border-indigo-200 bg-indigo-50 p-3 space-y-2">
      <h3 className="text-sm font-semibold text-indigo-900">Select Product to Issue</h3>
      <p className="text-xs text-indigo-700">
        Choose one product for this issuance session. Create another session for additional
        products.
      </p>
      <div className="flex flex-wrap gap-2">
        {availableProductSpecs.map((spec) => {
          const key = spec.kind === "paint" ? `paint:${spec.product}` : `rubber:${spec.specLabel}`;
          const label =
            spec.kind === "paint"
              ? `${spec.product}${spec.role != null ? ` (${spec.role})` : ""}`
              : spec.specLabel;
          const isSelected =
            selectedProductSpec != null &&
            ((selectedProductSpec.kind === "paint" &&
              spec.kind === "paint" &&
              selectedProductSpec.product === spec.product) ||
              (selectedProductSpec.kind === "rubber" &&
                spec.kind === "rubber" &&
                selectedProductSpec.specLabel === spec.specLabel));
          const baseColor =
            spec.kind === "paint"
              ? isSelected
                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                : "bg-white text-blue-800 border border-blue-300 hover:bg-blue-100"
              : isSelected
                ? "bg-purple-600 text-white ring-2 ring-purple-400"
                : "bg-white text-purple-800 border border-purple-300 hover:bg-purple-100";
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                const newSpec: SelectedProductSpec =
                  spec.kind === "paint"
                    ? { kind: "paint", product: spec.product, role: spec.role }
                    : { kind: "rubber", specLabel: spec.specLabel };
                setSelectedProductSpec(isSelected ? null : newSpec);
                setCart([] as never[]);
                setSearch("");
                setPendingAllocQty(null);
                setPendingCoatType(null);
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${baseColor}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {selectedProductSpec != null ? (
        <div className="text-[10px] text-indigo-600">
          Issuing:{" "}
          <span className="font-semibold">
            {selectedProductSpec.kind === "paint"
              ? selectedProductSpec.product
              : selectedProductSpec.specLabel}
          </span>
          {" \u2014 "}
          <button
            type="button"
            onClick={() => {
              setSelectedProductSpec(null);
              setCart([] as never[]);
            }}
            className="underline hover:text-indigo-800"
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CpoJobCardList(props: {
  cpoChildJcs: CpoChildJc[];
  selectedCpoJcIds: number[];
  setSelectedCpoJcIds: (ids: number[]) => void;
  selectedLineItemIds: number[];
  setSelectedLineItemIds: (ids: number[]) => void;
  lineItemIssueQty: Record<number, number>;
  setLineItemIssueQty: (qty: Record<number, number>) => void;
  expandedJcIds: number[];
  setExpandedJcIds: (ids: number[]) => void;
  derivedCoatStatusMap: Record<number, Record<string, number>>;
  selectedProductSpec: SelectedProductSpec;
  cpoIssuedTotals: Array<{
    productId: number;
    productName: string;
    rowType: string;
    totalIssued: number;
  }>;
  cpoPerJcIssued: Record<string, Record<number, number>>;
  cpoCoatingSpecs: string | null;
}) {
  const {
    cpoChildJcs,
    selectedCpoJcIds,
    setSelectedCpoJcIds,
    selectedLineItemIds,
    setSelectedLineItemIds,
    lineItemIssueQty,
    setLineItemIssueQty,
    expandedJcIds,
    setExpandedJcIds,
    derivedCoatStatusMap,
    selectedProductSpec,
    cpoIssuedTotals,
    cpoPerJcIssued,
    cpoCoatingSpecs,
  } = props;

  return (
    <div className="rounded border border-teal-200 bg-teal-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-teal-900">
          Job Cards on this CPO ({cpoChildJcs.length})
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              const allExpanded = expandedJcIds.length === cpoChildJcs.length;
              setExpandedJcIds(allExpanded ? [] : cpoChildJcs.map((jc) => jc.id));
            }}
            className="text-xs text-teal-700 hover:underline"
          >
            {expandedJcIds.length === cpoChildJcs.length ? "Collapse all" : "Expand all"}
          </button>
          <button
            type="button"
            onClick={() => {
              const allSelected = selectedCpoJcIds.length === cpoChildJcs.length;
              if (allSelected) {
                setSelectedCpoJcIds([]);
                setSelectedLineItemIds([]);
              } else {
                setSelectedCpoJcIds(cpoChildJcs.map((jc) => jc.id));
                setSelectedLineItemIds(
                  cpoChildJcs.flatMap((jc) => jc.lineItems.map((li) => li.id)),
                );
              }
            }}
            className="text-xs text-teal-700 hover:underline"
          >
            {selectedCpoJcIds.length === cpoChildJcs.length ? "Deselect all" : "Select all"}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {cpoChildJcs.map((jc) => {
          const isSelected = selectedCpoJcIds.includes(jc.id);
          const jcFullyIssuedForSpec =
            selectedProductSpec != null &&
            jc.lineItems.length > 0 &&
            jc.lineItems.every((li) => {
              const fullQ = li.quantity == null ? 1 : li.quantity;
              const liStatus = derivedCoatStatusMap[li.id];
              if (liStatus == null) return false;
              if (selectedProductSpec.kind === "rubber") {
                const v = liStatus["rubber_lining"];
                return v != null && v >= fullQ;
              }
              const jcExtCoats = jc.coats.filter((ct) => ct.area === "external");
              const matched = jcExtCoats.find((ct) =>
                specMatchesCoat(selectedProductSpec, ct.product, ct.coatRole, false),
              );
              if (matched == null) return false;
              const role = matched.coatRole == null ? "coat" : matched.coatRole;
              const v = liStatus[role];
              return v != null && v >= fullQ;
            });
          const isExpanded = expandedJcIds.includes(jc.id);
          const jcLabel = jc.jcNumber == null ? jc.jobNumber : jc.jcNumber;
          const areaM2 = jc.totalAreaM2;
          const areaLabel = areaM2 > 0 ? `${areaM2.toFixed(1)} m²` : "";
          const jobNameLabel = jc.jobName == null ? "" : jc.jobName;
          const selectedItemCount = jc.lineItems.filter((li) =>
            selectedLineItemIds.includes(li.id),
          ).length;
          const totalItemCount = jc.lineItems.length;

          return (
            <div key={jc.id} className="rounded border border-teal-100 bg-white">
              <div
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer select-none hover:bg-teal-50"
                onClick={() => {
                  setExpandedJcIds(
                    isExpanded
                      ? expandedJcIds.filter((id) => id !== jc.id)
                      : [...expandedJcIds, jc.id],
                  );
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected && !jcFullyIssuedForSpec}
                  disabled={jcFullyIssuedForSpec}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => {
                    if (isSelected) {
                      setSelectedCpoJcIds(selectedCpoJcIds.filter((id) => id !== jc.id));
                      const jcLineIds = jc.lineItems.map((li) => li.id);
                      setSelectedLineItemIds(
                        selectedLineItemIds.filter((id) => !jcLineIds.includes(id)),
                      );
                    } else {
                      setSelectedCpoJcIds([...selectedCpoJcIds, jc.id]);
                      const jcLineIds = jc.lineItems.map((li) => li.id);
                      const newIds = jcLineIds.filter((id) => !selectedLineItemIds.includes(id));
                      setSelectedLineItemIds([...selectedLineItemIds, ...newIds]);
                    }
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
                />
                <svg
                  className={`h-3.5 w-3.5 shrink-0 text-teal-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm text-teal-900 font-medium truncate">{jcLabel}</span>
                {jobNameLabel !== "" ? (
                  <span className="text-xs text-gray-500 truncate hidden sm:inline">
                    {jobNameLabel}
                  </span>
                ) : null}
                {areaLabel !== "" ? (
                  <span className="text-xs text-teal-700 shrink-0">{areaLabel}</span>
                ) : null}
                {totalItemCount > 0 ? (
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {selectedItemCount}/{totalItemCount} items
                  </span>
                ) : null}
                {(() => {
                  const jcIdStr = String(jc.id);
                  const jcIssued = cpoPerJcIssued[jcIdStr];
                  if (!jcIssued) return null;
                  const issuedProductIds = keys(jcIssued).map(Number);
                  if (issuedProductIds.length === 0) return null;
                  const jcExtCoats = jc.coats.filter((ct) => ct.area === "external");
                  const hasIntCoat = jcExtCoats.some((ct) => ct.coatRole === "intermediate");
                  const issuedRoles = new Set<string>();
                  for (const t of cpoIssuedTotals) {
                    if (jcIssued[t.productId] == null) continue;
                    const issuedName = t.productName.toUpperCase();
                    for (const ct of jcExtCoats) {
                      const coatName = ct.product.toUpperCase();
                      const matches =
                        coatName.includes(issuedName.slice(0, 15)) ||
                        issuedName.includes(coatName.slice(0, 15));
                      if (!matches) continue;
                      const raw = ct.coatRole;
                      if (hasIntCoat && raw === "intermediate") {
                        issuedRoles.add("Final");
                      } else if (raw === "primer") {
                        issuedRoles.add("Primer");
                      } else if (raw === "final") {
                        issuedRoles.add("Final");
                      } else if (raw === "intermediate") {
                        issuedRoles.add("Intermediate");
                      }
                    }
                  }
                  if (issuedRoles.size === 0) return null;
                  const label = `${Array.from(issuedRoles).join(" + ")} Issued`;
                  return (
                    <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded shrink-0">
                      {label}
                    </span>
                  );
                })()}
              </div>

              {isExpanded && jc.lineItems.length > 0 ? (
                <CpoLineItemList
                  jc={jc}
                  selectedLineItemIds={selectedLineItemIds}
                  setSelectedLineItemIds={setSelectedLineItemIds}
                  selectedCpoJcIds={selectedCpoJcIds}
                  setSelectedCpoJcIds={setSelectedCpoJcIds}
                  lineItemIssueQty={lineItemIssueQty}
                  setLineItemIssueQty={setLineItemIssueQty}
                  derivedCoatStatusMap={derivedCoatStatusMap}
                  selectedProductSpec={selectedProductSpec}
                  isSelected={isSelected}
                  cpoCoatingSpecs={cpoCoatingSpecs}
                />
              ) : null}

              {isExpanded && jc.lineItems.length === 0 ? (
                <div className="border-t border-teal-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">
                  No line items on this job card
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CpoLineItemList(props: {
  jc: CpoChildJc;
  selectedLineItemIds: number[];
  setSelectedLineItemIds: (ids: number[]) => void;
  selectedCpoJcIds: number[];
  setSelectedCpoJcIds: (ids: number[]) => void;
  lineItemIssueQty: Record<number, number>;
  setLineItemIssueQty: (qty: Record<number, number>) => void;
  derivedCoatStatusMap: Record<number, Record<string, number>>;
  selectedProductSpec: SelectedProductSpec;
  isSelected: boolean;
  cpoCoatingSpecs: string | null;
}) {
  const {
    jc,
    selectedLineItemIds,
    setSelectedLineItemIds,
    selectedCpoJcIds,
    setSelectedCpoJcIds,
    lineItemIssueQty,
    setLineItemIssueQty,
    derivedCoatStatusMap,
    selectedProductSpec,
    isSelected,
    cpoCoatingSpecs,
  } = props;

  return (
    <div className="border-t border-teal-100 bg-gray-50 px-3 py-2 space-y-1.5">
      {jc.lineItems.map((li) => {
        const liSelected = selectedLineItemIds.includes(li.id);
        const itemLabel =
          li.itemDescription == null
            ? li.itemCode == null
              ? `Item #${li.id}`
              : li.itemCode
            : li.itemDescription;
        const itemNo = li.itemNo;
        const jtNo = li.jtNo;
        const liM2 = li.m2;
        const fullQty = li.quantity == null ? 1 : li.quantity;
        const rawIssueQty = lineItemIssueQty[li.id];
        const allExtCoats = jc.coats.filter((ct) => ct.area === "external");
        const hasIntermediateCoat = allExtCoats.some((ct) => ct.coatRole === "intermediate");
        const extCoats = allExtCoats
          .filter((ct) => !(hasIntermediateCoat && ct.coatRole === "final"))
          .map((ct) => {
            if (hasIntermediateCoat && ct.coatRole === "intermediate") {
              return { ...ct, coatRole: "final" as const };
            }
            return ct;
          });
        const descUpper = itemLabel.toUpperCase();
        const jcRubber = jc.hasInternalLining;
        const hasRubber =
          jcRubber === true ||
          descUpper.includes("R/L") ||
          descUpper.includes("R/FLG") ||
          descUpper.includes("RUBBER") ||
          descUpper.includes("+ R");
        const lineCoatStatus = derivedCoatStatusMap[li.id];
        const extIssuedValues = extCoats.map((ct) => {
          const role = ct.coatRole == null ? "coat" : ct.coatRole;
          if (lineCoatStatus == null) return 0;
          const v = lineCoatStatus[role];
          return v == null ? 0 : v;
        });
        const rubberIssuedVal = hasRubber
          ? (() => {
              if (lineCoatStatus == null) return 0;
              const v = lineCoatStatus["rubber_lining"];
              return v == null ? 0 : v;
            })()
          : null;
        const allCoatIssued =
          rubberIssuedVal == null ? extIssuedValues : [...extIssuedValues, rubberIssuedVal];
        const issuedForRemaining = (() => {
          if (selectedProductSpec == null) {
            return allCoatIssued.length > 0 ? Math.min(...allCoatIssued) : 0;
          }
          if (selectedProductSpec.kind === "rubber") {
            return rubberIssuedVal == null ? 0 : rubberIssuedVal;
          }
          const matchedCoat = extCoats.find((ct) =>
            specMatchesCoat(selectedProductSpec, ct.product, ct.coatRole, false),
          );
          if (matchedCoat == null || lineCoatStatus == null) return 0;
          const role = matchedCoat.coatRole == null ? "coat" : matchedCoat.coatRole;
          const v = lineCoatStatus[role];
          return v == null ? 0 : v;
        })();
        const remainingQty = Math.max(fullQty - issuedForRemaining, 0);
        const currentIssueQty =
          rawIssueQty == null ? remainingQty : Math.min(rawIssueQty, remainingQty);
        const fullyIssuedForSpec = selectedProductSpec != null && remainingQty === 0;
        return (
          <div
            key={li.id}
            className={`rounded px-2 py-1.5 text-xs ${liSelected && !fullyIssuedForSpec ? "bg-white" : "opacity-50"}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={liSelected && !fullyIssuedForSpec}
                disabled={fullyIssuedForSpec}
                onChange={() => {
                  if (liSelected) {
                    setSelectedLineItemIds(selectedLineItemIds.filter((id) => id !== li.id));
                  } else {
                    setSelectedLineItemIds([...selectedLineItemIds, li.id]);
                    if (!isSelected) {
                      setSelectedCpoJcIds([...selectedCpoJcIds, jc.id]);
                    }
                    if (lineItemIssueQty[li.id] == null) {
                      setLineItemIssueQty({
                        ...lineItemIssueQty,
                        [li.id]: remainingQty,
                      });
                    }
                  }
                }}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
              />
              {itemNo != null ? (
                <span className="font-mono text-gray-500 shrink-0">{itemNo}</span>
              ) : null}
              <span className="text-gray-800 truncate flex-1">{itemLabel}</span>
              {jtNo != null ? <span className="text-gray-400 shrink-0">JT {jtNo}</span> : null}
              {liM2 != null && liM2 > 0 ? (
                <span className="text-teal-700 shrink-0">{liM2.toFixed(1)} m²</span>
              ) : null}
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="text"
                  inputMode="numeric"
                  value={liSelected && currentIssueQty > 0 ? String(currentIssueQty) : ""}
                  disabled={!liSelected}
                  placeholder="0"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const parsed = raw === "" ? 0 : parseInt(raw, 10);
                    const val = Math.min(parsed, remainingQty);
                    setLineItemIssueQty({
                      ...lineItemIssueQty,
                      [li.id]: val,
                    });
                  }}
                  className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-center disabled:opacity-40"
                />
                <span className="text-gray-400">/ {fullQty}</span>
              </div>
            </div>
            {extCoats.length > 0 || hasRubber ? (
              <div className="ml-6 mt-1 space-y-0.5">
                {extCoats
                  .filter((ct) =>
                    specMatchesCoat(selectedProductSpec, ct.product, ct.coatRole, false),
                  )
                  .map((ct) => {
                    const roleLabel = ct.coatRole == null ? "coat" : ct.coatRole;
                    const itemM2 = liM2 == null ? 0 : liM2;
                    const coverage = ct.coverageM2PerLiter;
                    const coatLitres =
                      coverage > 0 && itemM2 > 0
                        ? (itemM2 * currentIssueQty) / (fullQty > 0 ? fullQty : 1) / coverage
                        : 0;
                    const liCoats = derivedCoatStatusMap[li.id];
                    const issuedQty =
                      liCoats == null ? 0 : liCoats[roleLabel] == null ? 0 : liCoats[roleLabel];
                    const remaining = Math.max(fullQty - issuedQty, 0);
                    const done = issuedQty >= fullQty && fullQty > 0;
                    const ctMinDft = ct.minDftUm;
                    const ctMaxDft = ct.maxDftUm;
                    const hasDft = ctMinDft != null && ctMaxDft != null;
                    return (
                      <div
                        key={ct.product + roleLabel}
                        className={`flex items-center gap-2 text-[10px] px-2 py-0.5 rounded ${
                          done
                            ? "bg-red-100 text-red-700"
                            : issuedQty > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        <span className="uppercase font-semibold w-10 shrink-0">EXT</span>
                        <span className="w-14 shrink-0 font-medium">{roleLabel}</span>
                        <span className="flex-1 truncate">{ct.product}</span>
                        {hasDft ? (
                          <span className="text-gray-500 shrink-0">
                            {ctMinDft}
                            {"\u2013"}
                            {ctMaxDft} {"\u00b5m"}
                          </span>
                        ) : null}
                        {coatLitres > 0 ? (
                          <span className="font-mono shrink-0">{coatLitres.toFixed(1)}L</span>
                        ) : null}
                        <span className="shrink-0 font-medium">
                          {issuedQty}/{fullQty}
                          {done ? " \u2713" : ""}
                        </span>
                      </div>
                    );
                  })}
                {hasRubber && specMatchesCoat(selectedProductSpec, "", null, true)
                  ? (() => {
                      const liCoats = derivedCoatStatusMap[li.id];
                      const issuedQty =
                        liCoats == null
                          ? 0
                          : liCoats.rubber_lining == null
                            ? 0
                            : liCoats.rubber_lining;
                      const done = issuedQty >= fullQty && fullQty > 0;
                      return (
                        <div
                          className={`flex items-center gap-2 text-[10px] px-2 py-0.5 rounded ${
                            done
                              ? "bg-red-100 text-red-700"
                              : issuedQty > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-50 text-green-700"
                          }`}
                        >
                          <span className="uppercase font-semibold w-10 shrink-0">INT</span>
                          <span className="w-14 shrink-0 font-medium">rubber</span>
                          <span className="flex-1">
                            {(() => {
                              if (cpoCoatingSpecs == null) return "Rubber Lining";
                              const specLines = cpoCoatingSpecs.split("\n");
                              const rlLine = specLines.find((ln) => {
                                const u = ln.trim().toUpperCase();
                                return (
                                  u.includes("R/L") && (u.includes("MM") || u.includes("SHORE"))
                                );
                              });
                              return rlLine == null ? "Rubber Lining" : rlLine.trim();
                            })()}
                          </span>
                          <span className="shrink-0 font-medium">
                            {issuedQty}/{fullQty}
                            {done ? " \u2713" : ""}
                          </span>
                        </div>
                      );
                    })()
                  : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
