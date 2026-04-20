"use client";

import { isArray, keys } from "es-toolkit/compat";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProRataJobCard } from "../components/PaintProRataSplitEditor";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

export interface CpoLineItem {
  id: number;
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  jtNo: string | null;
  quantity: number | null;
  m2: number | null;
}

export interface CoatDetail {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
  coatRole: string | null;
  litersRequired: number;
  coverageM2PerLiter: number;
  minDftUm: number | null;
  maxDftUm: number | null;
}

export interface CpoChildJc {
  id: number;
  jobNumber: string;
  jcNumber: string | null;
  jobName: string | null;
  status: string | null;
  extM2: number;
  intM2: number;
  totalAreaM2: number;
  lineItems: CpoLineItem[];
  lineItemCount: number;
  coats: CoatDetail[];
  hasInternalLining: boolean;
}

export type SelectedProductSpec =
  | { kind: "paint"; product: string; role: string | null }
  | { kind: "rubber"; specLabel: string }
  | null;

export function specMatchesCoat(
  spec: SelectedProductSpec,
  coatProduct: string,
  coatRole: string | null,
  isRubber: boolean,
): boolean {
  if (spec == null) return true;
  if (spec.kind === "rubber") return isRubber;
  if (isRubber) return false;
  const specName = spec.product.toUpperCase();
  const coatName = coatProduct.toUpperCase();
  return coatName.includes(specName.slice(0, 15)) || specName.includes(coatName.slice(0, 15));
}

interface UseCpoContextParams {
  targetKind: "cpo" | "job_card" | null;
  targetId: number | null;
}

export function useCpoContext(params: UseCpoContextParams) {
  const { targetKind, targetId } = params;
  const config = useStockManagementConfig();
  const authHeaders = config.authHeaders;
  const authHeadersRef = useRef(authHeaders);
  authHeadersRef.current = authHeaders;

  const [cpoChildJcs, setCpoChildJcs] = useState<CpoChildJc[]>([]);
  const [selectedCpoJcIds, setSelectedCpoJcIds] = useState<number[]>([]);
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<number[]>([]);
  const [lineItemIssueQty, setLineItemIssueQty] = useState<Record<number, number>>({});
  const [expandedJcIds, setExpandedJcIds] = useState<number[]>([]);
  const [cpoJcLoading, setCpoJcLoading] = useState(false);
  const cpoContextCache = useMemo(() => new Map<number, CpoChildJc[]>(), []);
  const prefetchStarted = useRef(false);
  const [cpoIssuedTotals, setCpoIssuedTotals] = useState<
    Array<{ productId: number; productName: string; rowType: string; totalIssued: number }>
  >([]);
  const [cpoPerJcIssued, setCpoPerJcIssued] = useState<Record<string, Record<number, number>>>({});
  const [coatStatusMap, setCoatStatusMap] = useState<Record<number, Record<string, number>>>({});
  const [cpoCoatingSpecs, setCpoCoatingSpecs] = useState<string | null>(null);
  const [selectedProductSpec, setSelectedProductSpec] = useState<SelectedProductSpec>(null);

  useEffect(() => {
    if (targetKind !== "cpo" || targetId == null) {
      setCpoIssuedTotals([]);
      setCpoPerJcIssued({});
      setCoatStatusMap({});
      return;
    }
    const hdrs = authHeadersRef.current();
    const opts: RequestInit = { headers: hdrs, credentials: "include" };
    fetch(`/api/stock-management/issuance/sessions/cpo-issued-totals/${targetId}`, opts)
      .then((res) => (res.ok ? res.json() : { totals: [], perJc: {} }))
      .then((data) => {
        const rawTotals = data.totals;
        const totals = rawTotals == null ? data : rawTotals;
        setCpoIssuedTotals(isArray(totals) ? totals : []);
        const rawPerJc = data.perJc;
        setCpoPerJcIssued(rawPerJc == null ? {} : rawPerJc);
      })
      .catch(() => {
        setCpoIssuedTotals([]);
        setCpoPerJcIssued({});
      });
    fetch(`/api/stock-management/issuance/sessions/cpo-coat-status/${targetId}`, opts)
      .then((res) => (res.ok ? res.json() : []))
      .then(
        (
          items: Array<{
            lineItemId: number;
            jobCardId: number;
            coatType: string;
            totalQuantityIssued: number;
          }>,
        ) => {
          const map: Record<number, Record<string, number>> = {};
          for (const item of items) {
            if (!map[item.lineItemId]) map[item.lineItemId] = {};
            const existing = map[item.lineItemId][item.coatType];
            map[item.lineItemId][item.coatType] =
              (existing == null ? 0 : existing) + item.totalQuantityIssued;
          }
          setCoatStatusMap(map);
        },
      )
      .catch(() => setCoatStatusMap({}));
  }, [targetKind, targetId]);

  useEffect(() => {
    if (targetKind !== "cpo" || targetId == null) {
      setCpoChildJcs([]);
      setSelectedCpoJcIds([]);
      setSelectedLineItemIds([]);
      setLineItemIssueQty({});
      setExpandedJcIds([]);
      setSelectedProductSpec(null);
      return;
    }
    const cached = cpoContextCache.get(targetId);
    if (cached) {
      setCpoChildJcs(cached);
      setSelectedCpoJcIds(cached.map((jc) => jc.id));
      const allLineIds = cached.flatMap((jc) => jc.lineItems.map((li) => li.id));
      setSelectedLineItemIds(allLineIds);
      const defaultQty: Record<number, number> = {};
      for (const jc of cached) {
        for (const li of jc.lineItems) {
          defaultQty[li.id] = li.quantity == null ? 1 : li.quantity;
        }
      }
      setLineItemIssueQty(defaultQty);
      setExpandedJcIds([]);
      return;
    }
    let cancelled = false;
    setCpoJcLoading(true);
    fetch(`/api/stock-control/issuance/cpo-batch/context/${targetId}`, {
      headers: authHeadersRef.current(),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then(
        (data: {
          cpo?: { coatingSpecs?: string | null };
          jobCards?: Array<{
            id: number;
            jobNumber: string;
            jcNumber: string | null;
            jobName?: string | null;
            status?: string | null;
            extM2: number;
            intM2: number;
            lineItems?: CpoLineItem[];
            lineItemCount?: number;
            coatingAnalysis?: { coats?: CoatDetail[]; hasInternalLining?: boolean } | null;
          }>;
        }) => {
          if (cancelled) return;
          const rawJcs = data.jobCards;
          const jcs = rawJcs == null ? [] : rawJcs;
          const mapped: CpoChildJc[] = jcs.map((jc) => {
            const items = jc.lineItems == null ? [] : jc.lineItems;
            const ca = jc.coatingAnalysis;
            const rawCoats = ca == null ? [] : ca.coats == null ? [] : ca.coats;
            return {
              id: jc.id,
              jcNumber: jc.jcNumber,
              jobNumber: jc.jobNumber,
              jobName: jc.jobName == null ? null : jc.jobName,
              status: jc.status == null ? null : jc.status,
              extM2: jc.extM2,
              intM2: jc.intM2,
              totalAreaM2: jc.extM2 + jc.intM2,
              lineItems: items,
              lineItemCount: jc.lineItemCount == null ? items.length : jc.lineItemCount,
              coats: rawCoats,
              hasInternalLining: ca == null ? false : ca.hasInternalLining === true,
            };
          });
          cpoContextCache.set(targetId, mapped);
          const cpoObj = data.cpo;
          const specs = cpoObj == null ? null : cpoObj.coatingSpecs;
          setCpoCoatingSpecs(specs == null ? null : specs);
          setCpoChildJcs(mapped);
          setSelectedCpoJcIds(mapped.map((jc) => jc.id));
          const allLineIds = mapped.flatMap((jc) => jc.lineItems.map((li) => li.id));
          setSelectedLineItemIds(allLineIds);
          const defaultQty: Record<number, number> = {};
          for (const mjc of mapped) {
            for (const li of mjc.lineItems) {
              defaultQty[li.id] = li.quantity == null ? 1 : li.quantity;
            }
          }
          setLineItemIssueQty(defaultQty);
          setExpandedJcIds([]);
        },
      )
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Failed to load CPO ${targetId} job cards: ${message}`);
        setCpoChildJcs([]);
        setSelectedCpoJcIds([]);
        setSelectedLineItemIds([]);
      })
      .finally(() => {
        if (!cancelled) setCpoJcLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetKind, targetId, cpoContextCache]);

  const pickerCpos = config.pickerData.cpos;
  const pickerLoading = config.pickerData.isLoading;
  useEffect(() => {
    if (pickerLoading || pickerCpos.length === 0 || prefetchStarted.current) return;
    prefetchStarted.current = true;
    const headers = authHeadersRef.current();
    const opts: RequestInit = { headers, credentials: "include" };
    const parseCpoContext = (data: {
      jobCards?: Array<{
        id: number;
        jobNumber: string;
        jcNumber: string | null;
        jobName?: string | null;
        status?: string | null;
        extM2: number;
        intM2: number;
        lineItems?: CpoLineItem[];
        lineItemCount?: number;
        coatingAnalysis?: { coats?: CoatDetail[]; hasInternalLining?: boolean } | null;
      }>;
    }): CpoChildJc[] => {
      const rawJcs = data.jobCards;
      const jcs = rawJcs == null ? [] : rawJcs;
      return jcs.map((jc) => {
        const items = jc.lineItems == null ? [] : jc.lineItems;
        const ca = jc.coatingAnalysis;
        const rawCoats = ca == null ? [] : ca.coats == null ? [] : ca.coats;
        return {
          id: jc.id,
          jcNumber: jc.jcNumber,
          jobNumber: jc.jobNumber,
          jobName: jc.jobName == null ? null : jc.jobName,
          status: jc.status == null ? null : jc.status,
          extM2: jc.extM2,
          intM2: jc.intM2,
          totalAreaM2: jc.extM2 + jc.intM2,
          lineItems: items,
          lineItemCount: jc.lineItemCount == null ? items.length : jc.lineItemCount,
          coats: rawCoats,
          hasInternalLining: ca == null ? false : ca.hasInternalLining === true,
        };
      });
    };

    const prefetchOne = async (cpoId: number) => {
      if (cpoContextCache.has(cpoId)) return;
      try {
        const r = await fetch(`/api/stock-control/issuance/cpo-batch/context/${cpoId}`, opts);
        if (r.ok) {
          const data = await r.json();
          cpoContextCache.set(cpoId, parseCpoContext(data));
        }
      } catch (_) {
        /* background prefetch — swallow errors */
      }
    };

    const runPrefetch = async () => {
      for (const cpo of pickerCpos) {
        await prefetchOne(cpo.id);
      }
    };
    runPrefetch();
  }, [pickerCpos, pickerLoading, cpoContextCache]);

  const derivedCoatStatusMap = useMemo(() => {
    const hasBackendData = keys(coatStatusMap).length > 0;
    if (hasBackendData) return coatStatusMap;
    if (cpoIssuedTotals.length === 0 || cpoChildJcs.length === 0) return coatStatusMap;

    const map: Record<number, Record<string, number>> = {};
    for (const jc of cpoChildJcs) {
      const jcIdStr = String(jc.id);
      const jcIssued = cpoPerJcIssued[jcIdStr];
      if (!jcIssued) continue;

      const allExtCoats = jc.coats.filter((ct) => ct.area === "external");
      const hasIntermediate = allExtCoats.some((ct) => ct.coatRole === "intermediate");
      const extCoats = allExtCoats
        .filter((ct) => !(hasIntermediate && ct.coatRole === "final"))
        .map((ct) => {
          if (hasIntermediate && ct.coatRole === "intermediate") {
            return { ...ct, coatRole: "final" as const };
          }
          return ct;
        });

      const matchedRoles: Array<{ role: string; fraction: number }> = [];
      for (const issuedEntry of cpoIssuedTotals) {
        const issuedName = issuedEntry.productName.toUpperCase();
        const issuedLitres = jcIssued[issuedEntry.productId];
        if (issuedLitres == null || issuedLitres <= 0) continue;

        const matchedCoat = extCoats.find((ct) => {
          const coatName = ct.product.toUpperCase();
          return (
            coatName.includes(issuedName.slice(0, 15)) || issuedName.includes(coatName.slice(0, 15))
          );
        });
        if (!matchedCoat) continue;

        const coatRole = matchedCoat.coatRole == null ? "primer" : matchedCoat.coatRole;
        const totalCoatLitres = matchedCoat.litersRequired;
        if (totalCoatLitres <= 0) continue;

        const fraction = Math.min(issuedLitres / totalCoatLitres, 1);
        matchedRoles.push({ role: coatRole, fraction });
      }

      if (matchedRoles.length === 0) continue;

      const maxFraction = Math.max(...matchedRoles.map((m) => m.fraction));
      const issuedRoleNames = matchedRoles.map((m) => m.role);

      for (const li of jc.lineItems) {
        const liQty = li.quantity == null ? 1 : li.quantity;
        const issuedUnits = Math.round(liQty * maxFraction);
        if (issuedUnits <= 0) continue;
        if (!map[li.id]) map[li.id] = {};
        for (const roleName of issuedRoleNames) {
          const existing = map[li.id][roleName];
          map[li.id][roleName] = (existing == null ? 0 : existing) + issuedUnits;
        }
      }
    }
    return map;
  }, [coatStatusMap, cpoIssuedTotals, cpoPerJcIssued, cpoChildJcs]);

  const selectedCoatsSummary = useMemo(() => {
    const selectedJcs = cpoChildJcs.filter((jc) => selectedCpoJcIds.includes(jc.id));
    let totalSelectedM2 = 0;
    const allCoats = selectedJcs.flatMap((jc) => jc.coats);
    const hasIntermediate = allCoats.some((c) => c.coatRole === "intermediate");
    const paintMap = new Map<
      string,
      {
        litres: number;
        role: string | null;
        minDftUm: number | null;
        maxDftUm: number | null;
        genericType: string | null;
      }
    >();

    for (const jc of selectedJcs) {
      const selectedItems = jc.lineItems.filter((li) => selectedLineItemIds.includes(li.id));
      const noItemsSelected = selectedItems.length === 0;

      if (noItemsSelected && jc.lineItems.length > 0) continue;

      let m2Ratio: number;
      if (jc.lineItems.length === 0) {
        totalSelectedM2 += jc.totalAreaM2;
        m2Ratio = 1;
      } else {
        const totalItemM2 = jc.lineItems.reduce((sum, li) => {
          const liM2 = li.m2 == null ? 0 : li.m2;
          return sum + liM2;
        }, 0);
        const selectedItemM2 = selectedItems.reduce((sum, li) => {
          const fullQty = li.quantity == null ? 1 : li.quantity;
          const rawIssueQtyVal = lineItemIssueQty[li.id];
          const rawIssue = rawIssueQtyVal == null ? fullQty : rawIssueQtyVal;
          const lineStatus = derivedCoatStatusMap[li.id];
          const specIssued = (() => {
            if (selectedProductSpec == null || lineStatus == null) return 0;
            if (selectedProductSpec.kind === "rubber") {
              const v = lineStatus["rubber_lining"];
              return v == null ? 0 : v;
            }
            const jcExtCoats = jc.coats.filter((ct) => ct.area === "external");
            const matched = jcExtCoats.find((ct) =>
              specMatchesCoat(selectedProductSpec, ct.product, ct.coatRole, false),
            );
            if (matched == null) return 0;
            const role = matched.coatRole == null ? "coat" : matched.coatRole;
            const v = lineStatus[role];
            return v == null ? 0 : v;
          })();
          const remaining =
            selectedProductSpec != null ? Math.max(fullQty - specIssued, 0) : fullQty;
          const issueQty = Math.min(rawIssue, remaining);
          const liM2 = li.m2 == null ? 0 : li.m2;
          const qtyRatio = fullQty > 0 ? issueQty / fullQty : 1;
          return sum + liM2 * qtyRatio;
        }, 0);
        const jcM2 =
          totalItemM2 > 0
            ? jc.totalAreaM2 * (selectedItemM2 / totalItemM2)
            : jc.totalAreaM2 * (selectedItems.length / jc.lineItems.length);
        totalSelectedM2 += jcM2;
        m2Ratio =
          totalItemM2 > 0
            ? selectedItemM2 / totalItemM2
            : selectedItems.length / jc.lineItems.length;
      }

      for (const coat of jc.coats) {
        const isBanding = hasIntermediate && coat.coatRole === "final";
        if (isBanding) continue;
        const displayRole =
          hasIntermediate && coat.coatRole === "intermediate" ? "final" : coat.coatRole;
        const scaledLitres = coat.litersRequired * m2Ratio;
        const key = coat.product;
        const existing = paintMap.get(key);
        if (existing) {
          paintMap.set(key, {
            litres: existing.litres + scaledLitres,
            role: displayRole,
            minDftUm: existing.minDftUm,
            maxDftUm: existing.maxDftUm,
            genericType: existing.genericType,
          });
        } else {
          paintMap.set(key, {
            litres: scaledLitres,
            role: displayRole,
            minDftUm: coat.minDftUm,
            maxDftUm: coat.maxDftUm,
            genericType: coat.genericType,
          });
        }
      }
    }

    const activeJcCount = selectedJcs.filter((jc) => {
      if (jc.lineItems.length === 0) return true;
      return jc.lineItems.some((li) => selectedLineItemIds.includes(li.id));
    }).length;

    const paints = Array.from(paintMap.entries()).map(([product, info]) => ({
      product,
      litres: info.litres,
      role: info.role,
      minDftUm: info.minDftUm,
      maxDftUm: info.maxDftUm,
      genericType: info.genericType,
    }));
    return { selectedM2: totalSelectedM2, paints, selectedJcCount: activeJcCount };
  }, [
    cpoChildJcs,
    selectedCpoJcIds,
    selectedLineItemIds,
    lineItemIssueQty,
    derivedCoatStatusMap,
    selectedProductSpec,
  ]);

  const availableProductSpecs = useMemo(() => {
    if (targetKind !== "cpo" || cpoChildJcs.length === 0) return [];
    const specs: Array<
      | { kind: "paint"; product: string; role: string | null; totalLitres: number }
      | { kind: "rubber"; specLabel: string }
    > = [];
    for (const p of selectedCoatsSummary.paints) {
      specs.push({ kind: "paint", product: p.product, role: p.role, totalLitres: p.litres });
    }
    const hasRubberJc = cpoChildJcs.some((jc) => jc.hasInternalLining);
    if (hasRubberJc && cpoCoatingSpecs != null) {
      const lines = cpoCoatingSpecs.split("\n");
      const rubberSpecs = new Set<string>();
      for (const line of lines) {
        const upper = line.trim().toUpperCase();
        if (
          upper.includes("R/L") ||
          upper.includes("RUBBER") ||
          upper.includes("FOLD") ||
          upper.includes("LOOSE RUBBER")
        ) {
          rubberSpecs.add(line.trim());
        }
      }
      for (const spec of rubberSpecs) {
        specs.push({ kind: "rubber", specLabel: spec });
      }
    } else if (hasRubberJc) {
      specs.push({ kind: "rubber", specLabel: "Rubber Lining" });
    }
    return specs;
  }, [targetKind, cpoChildJcs, selectedCoatsSummary.paints, cpoCoatingSpecs]);

  const cpoJobCards = useMemo<ProRataJobCard[]>(() => {
    return cpoChildJcs
      .filter((jc) => selectedCpoJcIds.includes(jc.id))
      .map((jc) => ({
        id: jc.id,
        jcNumber: jc.jcNumber,
        jobNumber: jc.jobNumber,
        totalAreaM2: jc.totalAreaM2,
      }));
  }, [cpoChildJcs, selectedCpoJcIds]);

  const showPaintProRata = useMemo(() => {
    return targetKind === "cpo" && cpoJobCards.length > 1;
  }, [targetKind, cpoJobCards]);

  return {
    cpoChildJcs,
    setCpoChildJcs,
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
    setCpoIssuedTotals,
    cpoPerJcIssued,
    setCpoPerJcIssued,
    coatStatusMap,
    setCoatStatusMap,
    cpoCoatingSpecs,
    setCpoCoatingSpecs,
    selectedProductSpec,
    setSelectedProductSpec,
    derivedCoatStatusMap,
    selectedCoatsSummary,
    availableProductSpecs,
    cpoJobCards,
    showPaintProRata,
  };
}
