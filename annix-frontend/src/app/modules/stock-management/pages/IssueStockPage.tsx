"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { JobCardOrCpoPicker, type TargetSelection } from "../components/JobCardOrCpoPicker";
import {
  PaintProRataSplitEditor,
  type ProRataJobCard,
  type ProRataSplit,
} from "../components/PaintProRataSplitEditor";
import {
  type RubberRollIssueDetails,
  RubberRollSubEditor,
} from "../components/RubberRollSubEditor";
import { StaffPicker } from "../components/StaffPicker";
import { useCreateIssuanceSession, useIssuableProducts } from "../hooks/useIssuanceQueries";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";
import type { IssuanceRowInputDto, ItemCoatAllocationDto } from "../types/issuance";
import type { IssuableProductDto } from "../types/products";

type StepKey = "issuer" | "recipient" | "target" | "items" | "confirm";

const STEPS: ReadonlyArray<{ key: StepKey; label: string }> = [
  { key: "issuer", label: "Issuer" },
  { key: "recipient", label: "Recipient" },
  { key: "target", label: "Job Card or CPO" },
  { key: "items", label: "Items" },
  { key: "confirm", label: "Confirm" },
];

interface CpoLineItem {
  id: number;
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  jtNo: string | null;
  quantity: number | null;
  m2: number | null;
}

interface CoatDetail {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
  coatRole: string | null;
  litersRequired: number;
  coverageM2PerLiter: number;
}

interface CpoChildJc {
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

interface CartRow {
  product: IssuableProductDto;
  quantity: number;
  batchNumber: string;
  tinBatchNumbers: string[];
  coatType: "primer" | "intermediate" | "final" | "rubber_lining" | null;
  paintSplits: ProRataSplit[];
  rubberRollDetails: RubberRollIssueDetails;
}

function kitSizeForProduct(product: IssuableProductDto): number | null {
  const paint = product.paint;
  if (!paint) return null;
  const numParts = paint.numberOfParts;
  const ratioStr = paint.mixingRatio;
  const packA = paint.packSizeLitres;
  if (numParts == null || numParts <= 1 || !ratioStr || !packA) return null;
  const ratioParts = ratioStr.split(":").map(Number);
  const rawA = ratioParts[0];
  const rawB = ratioParts[1];
  const rawC = ratioParts[2];
  const rA = rawA == null || Number.isNaN(rawA) ? 1 : rawA;
  const rB = rawB == null || Number.isNaN(rawB) ? 0 : rawB;
  const rC = rawC == null || Number.isNaN(rawC) ? 0 : rawC;
  const totalRatio = rA + rB + rC;
  return packA * (totalRatio / rA);
}

function buildCoatAllocations(
  coatType: ItemCoatAllocationDto["coatType"],
  selectedLineItemIds: number[],
  cpoChildJcs: Array<{ id: number; lineItems: Array<{ id: number; quantity: number | null }> }>,
  lineItemIssueQty: Record<number, number>,
): ItemCoatAllocationDto[] {
  const allocations: ItemCoatAllocationDto[] = [];
  for (const jc of cpoChildJcs) {
    for (const li of jc.lineItems) {
      if (!selectedLineItemIds.includes(li.id)) continue;
      const fullQty = li.quantity == null ? 1 : li.quantity;
      const rawIssueQty = lineItemIssueQty[li.id];
      const issueQty = rawIssueQty == null ? fullQty : rawIssueQty;
      if (issueQty <= 0) continue;
      allocations.push({
        lineItemId: li.id,
        jobCardId: jc.id,
        coatType,
        quantityIssued: issueQty,
      });
    }
  }
  return allocations;
}

function snapToKit(litres: number, kitSize: number): { down: number; up: number } {
  const kitsDown = Math.floor(litres / kitSize);
  const kitsUp = Math.ceil(litres / kitSize);
  return {
    down: Math.max(kitsDown, 1) * kitSize,
    up: Math.max(kitsUp, 1) * kitSize,
  };
}

const EMPTY_RUBBER_ROLL: RubberRollIssueDetails = {
  weightKgIssued: 0,
  issuedWidthMm: null,
  issuedLengthM: null,
  issuedThicknessMm: null,
  expectsOffcutReturn: false,
};

export function IssueStockPage() {
  const config = useStockManagementConfig();
  const isBasicEnabled = useStockManagementFeature("BASIC_ISSUING");
  const isPhotoEnabled = useStockManagementFeature("PHOTO_IDENTIFICATION");
  const loggedInStaffId = config.currentUser.staffId;
  const initialIssuerStaffId: number | "" = loggedInStaffId == null ? "" : loggedInStaffId;
  const [currentStep, setCurrentStep] = useState<StepKey>("issuer");
  const [issuerStaffId, setIssuerStaffId] = useState<number | "">(initialIssuerStaffId);
  const [recipientStaffId, setRecipientStaffId] = useState<number | "">("");
  const [target, setTarget] = useState<TargetSelection | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [cpoChildJcs, setCpoChildJcs] = useState<CpoChildJc[]>([]);
  const [selectedCpoJcIds, setSelectedCpoJcIds] = useState<number[]>([]);
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<number[]>([]);
  const [lineItemIssueQty, setLineItemIssueQty] = useState<Record<number, number>>({});
  const [expandedJcIds, setExpandedJcIds] = useState<number[]>([]);
  const [cpoJcLoading, setCpoJcLoading] = useState(false);
  const cpoContextCache = useMemo(() => new Map<number, CpoChildJc[]>(), []);
  const prefetchStarted = useRef(false);
  const [singleJcData, setSingleJcData] = useState<CpoChildJc | null>(null);
  const [singleJcLoading, setSingleJcLoading] = useState(false);
  const [singleJcExpanded, setSingleJcExpanded] = useState(false);
  const [singleJcSelectedItems, setSingleJcSelectedItems] = useState<number[]>([]);
  const jcDetailCache = useMemo(() => new Map<number, CpoChildJc>(), []);
  const [allocPaintQty, setAllocPaintQty] = useState<Record<string, number>>({});
  const [pendingAllocQty, setPendingAllocQty] = useState<number | null>(null);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [photoResult, setPhotoResult] = useState<{
    matches: Array<{ productId: number; sku: string; name: string; productType: string }>;
  } | null>(null);
  const [linkedPartsMap, setLinkedPartsMap] = useState<Record<number, IssuableProductDto[]>>({});
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);
  const [cpoIssuedTotals, setCpoIssuedTotals] = useState<
    Array<{ productId: number; productName: string; rowType: string; totalIssued: number }>
  >([]);
  const [cpoPerJcIssued, setCpoPerJcIssued] = useState<Record<string, Record<number, number>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [coatStatusMap, setCoatStatusMap] = useState<Record<number, Record<string, number>>>({});

  const { data: productsResult, isLoading } = useIssuableProducts({
    search: search || undefined,
    active: true,
    pageSize: 25,
  });
  const createMutation = useCreateIssuanceSession();
  const productItems = productsResult?.items;
  const products = productItems ? productItems : [];

  const targetKind = target == null ? null : target.kind;
  const targetId = target == null ? null : target.id;
  const authHeaders = config.authHeaders;
  const authHeadersRef = useRef(authHeaders);
  authHeadersRef.current = authHeaders;

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
        setCpoIssuedTotals(Array.isArray(totals) ? totals : []);
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

  const selectedCoatsSummary = useMemo(() => {
    const selectedJcs = cpoChildJcs.filter((jc) => selectedCpoJcIds.includes(jc.id));
    let totalSelectedM2 = 0;
    const allCoats = selectedJcs.flatMap((jc) => jc.coats);
    const hasIntermediate = allCoats.some((c) => c.coatRole === "intermediate");
    const paintMap = new Map<string, { litres: number; role: string | null }>();

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
          const liQty = li.quantity == null ? 1 : li.quantity;
          const liM2 = li.m2 == null ? 0 : li.m2;
          return sum + liM2;
        }, 0);
        const selectedItemM2 = selectedItems.reduce((sum, li) => {
          const fullQty = li.quantity == null ? 1 : li.quantity;
          const issueQty = lineItemIssueQty[li.id] == null ? fullQty : lineItemIssueQty[li.id];
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
          paintMap.set(key, { litres: existing.litres + scaledLitres, role: displayRole });
        } else {
          paintMap.set(key, { litres: scaledLitres, role: displayRole });
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
    }));
    return { selectedM2: totalSelectedM2, paints, selectedJcCount: activeJcCount };
  }, [cpoChildJcs, selectedCpoJcIds, selectedLineItemIds, lineItemIssueQty]);

  const showPaintProRata = useMemo(() => {
    return targetKind === "cpo" && cpoJobCards.length > 1;
  }, [targetKind, cpoJobCards]);

  if (!isBasicEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">{config.label("issueStock.title")}</h1>
        <p className="text-sm text-gray-600">{config.label("feature.upgradePrompt.body")}</p>
      </div>
    );
  }

  const addToCart = (product: IssuableProductDto) => {
    if (cart.some((c) => c.product.id === product.id)) return;
    const rawQty = pendingAllocQty != null ? pendingAllocQty : 1;
    const kit = kitSizeForProduct(product);
    const qty = kit != null ? snapToKit(rawQty, kit).up : rawQty;
    setCart([
      ...cart,
      {
        product,
        quantity: qty,
        batchNumber: "",
        tinBatchNumbers: [],
        coatType: (() => {
          if (product.productType === "rubber_roll") return "rubber_lining" as const;
          const paintDetail = product.paint;
          const ct = paintDetail == null ? null : paintDetail.coatType;
          if (ct === "primer") return "primer" as const;
          if (ct === "finish" || ct === "intermediate") return "final" as const;
          return null;
        })(),
        paintSplits: [],
        rubberRollDetails: { ...EMPTY_RUBBER_ROLL },
      },
    ]);
    setPendingAllocQty(null);
    const groupKey = product.paint?.componentGroupKey;
    if (product.productType === "paint" && groupKey) {
      fetch(`/api/stock-management/products/${product.id}/linked-parts`, {
        headers: authHeadersRef.current(),
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((parts: IssuableProductDto[]) => {
          setLinkedPartsMap((prev) => ({ ...prev, [product.id]: parts }));
        })
        .catch(() => {});
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((c) => c.product.id !== productId));
  };

  const updateCartRow = (productId: number, patch: Partial<CartRow>) => {
    setCart(cart.map((c) => (c.product.id === productId ? { ...c, ...patch } : c)));
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoCapturing(true);
    setPhotoResult(null);
    try {
      const client = new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      });
      const result = await client.identifyPhoto(file);
      setPhotoResult({ matches: result.matches });
    } catch (err) {
      console.error("Photo identification failed", err);
      alert("Photo identification failed");
    } finally {
      setPhotoCapturing(false);
      e.target.value = "";
    }
  };

  const resetForm = () => {
    setCurrentStep("issuer");
    setRecipientStaffId("");
    setTarget(null);
    setSearch("");
    setCart([]);
    setCpoChildJcs([]);
    setSelectedCpoJcIds([]);
    setSelectedLineItemIds([]);
    setLineItemIssueQty({});
    setExpandedJcIds([]);
    setSingleJcData(null);
    setSingleJcExpanded(false);
    setSingleJcSelectedItems([]);
    setAllocPaintQty({});
    setPendingAllocQty(null);
    setPhotoResult(null);
    setLinkedPartsMap({});
    setCpoIssuedTotals([]);
    setCpoPerJcIssued({});
    setCoatStatusMap({});
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const rowJobCardId =
      target != null && target.kind === "job_card"
        ? target.id
        : selectedCpoJcIds.length === 1
          ? selectedCpoJcIds[0]
          : null;
    const rows: IssuanceRowInputDto[] = cart.map((row) => {
      if (row.product.productType === "paint") {
        const splits = row.paintSplits;
        const hasSplits = splits.length > 0;
        const proRataMap: Record<string, number> = {};
        if (hasSplits) {
          for (const split of splits) {
            proRataMap[String(split.jobCardId)] = split.litres;
          }
        }
        const paintCoatAllocs =
          row.coatType != null
            ? buildCoatAllocations(row.coatType, selectedLineItemIds, cpoChildJcs, lineItemIssueQty)
            : null;
        return {
          rowType: "paint",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          litres: row.quantity,
          batchNumber: row.batchNumber || null,
          cpoProRataSplit: hasSplits ? proRataMap : null,
          itemCoatAllocations: paintCoatAllocs,
        };
      }
      if (row.product.productType === "rubber_roll") {
        const details = row.rubberRollDetails;
        const weight = details.weightKgIssued > 0 ? details.weightKgIssued : row.quantity;
        const rubberCoatAllocs =
          row.coatType != null
            ? buildCoatAllocations(row.coatType, selectedLineItemIds, cpoChildJcs, lineItemIssueQty)
            : null;
        return {
          rowType: "rubber_roll",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          weightKgIssued: weight,
          issuedWidthMm: details.issuedWidthMm,
          issuedLengthM: details.issuedLengthM,
          issuedThicknessMm: details.issuedThicknessMm,
          itemCoatAllocations: rubberCoatAllocs,
        };
      }
      if (row.product.productType === "solution") {
        return {
          rowType: "solution",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          volumeL: row.quantity,
          batchNumber: row.batchNumber || null,
        };
      }
      return {
        rowType: "consumable",
        productId: row.product.id,
        jobCardId: rowJobCardId,
        quantity: row.quantity,
        batchNumber: row.batchNumber || null,
      };
    });
    const sessionCpoId = target != null && target.kind === "cpo" ? target.id : null;
    const sessionJobCardIds =
      target != null && target.kind === "job_card"
        ? [target.id]
        : selectedCpoJcIds.length > 0
          ? selectedCpoJcIds
          : null;
    try {
      await createMutation.createSession({
        issuerStaffId: issuerStaffId === "" ? null : Number(issuerStaffId),
        recipientStaffId: recipientStaffId === "" ? null : Number(recipientStaffId),
        cpoId: sessionCpoId,
        jobCardIds: sessionJobCardIds,
        rows,
      });
      setSubmitSuccess(true);
      setTimeout(resetForm, 3000);
    } catch (err) {
      console.error("Submit failed", err);
      const msg = err instanceof Error ? err.message : "Submit failed";
      setSubmitError(msg);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {config.label("issueStock.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{config.label("issueStock.subtitle")}</p>
      </header>

      <nav className="flex items-center gap-2 flex-wrap">
        {STEPS.map((step, index) => {
          const isActive = step.key === currentStep;
          const isComplete = index < stepIndex;
          const tone = isActive
            ? "bg-teal-600 text-white"
            : isComplete
              ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-500";
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setCurrentStep(step.key)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition ${tone}`}
            >
              {index + 1}. {config.label(`issueStock.step.${step.key}`, step.label)}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        {currentStep === "issuer" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Issuer (storeman issuing the stock)</h2>
            <StaffPicker
              value={issuerStaffId}
              onChange={setIssuerStaffId}
              placeholder="Search staff issuing the stock"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("recipient")}
              disabled={!issuerStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === "recipient" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Recipient (staff receiving the stock)</h2>
            <StaffPicker
              value={recipientStaffId}
              onChange={setRecipientStaffId}
              placeholder="Search staff receiving the stock"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("target")}
              disabled={!recipientStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === "target" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Job Card or CPO</h2>
            <p className="text-xs text-gray-500">
              Optional. Pick a job card or a CPO to link this issuance to, or skip to continue
              without one.
            </p>
            <JobCardOrCpoPicker value={target} onChange={setTarget} />

            {targetKind === "job_card" && singleJcLoading ? (
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                Loading job card details...
              </div>
            ) : null}

            {targetKind === "job_card" && !singleJcLoading && singleJcData != null ? (
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-teal-900">
                      Line Items ({singleJcData.lineItems.length})
                    </span>
                    {singleJcData.totalAreaM2 > 0 ? (
                      <span className="text-xs text-teal-700">
                        {singleJcData.totalAreaM2.toFixed(1)} m²
                      </span>
                    ) : null}
                    <span className="text-[10px] text-gray-400">
                      {singleJcSelectedItems.length}/{singleJcData.lineItems.length} selected
                    </span>
                  </button>
                  {singleJcData.lineItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected =
                          singleJcSelectedItems.length === singleJcData.lineItems.length;
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
                          {jtNo != null ? (
                            <span className="text-gray-400 shrink-0">JT {jtNo}</span>
                          ) : null}
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
            ) : null}

            {targetKind === "cpo" && cpoJcLoading ? (
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                Loading job cards for this CPO...
              </div>
            ) : null}

            {targetKind === "cpo" && !cpoJcLoading && cpoChildJcs.length > 0 ? (
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
                      {selectedCpoJcIds.length === cpoChildJcs.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {cpoChildJcs.map((jc) => {
                    const isSelected = selectedCpoJcIds.includes(jc.id);
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
                            checked={isSelected}
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
                                const newIds = jcLineIds.filter(
                                  (id) => !selectedLineItemIds.includes(id),
                                );
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
                          <span className="text-sm text-teal-900 font-medium truncate">
                            {jcLabel}
                          </span>
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
                            const entries = Object.entries(jcIssued);
                            if (entries.length === 0) return null;
                            return (
                              <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded shrink-0">
                                {entries.length} paint{entries.length !== 1 ? "s" : ""} issued
                              </span>
                            );
                          })()}
                        </div>

                        {isExpanded && jc.lineItems.length > 0 ? (
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
                              const currentIssueQty = rawIssueQty == null ? fullQty : rawIssueQty;
                              const allExtCoats = jc.coats.filter((ct) => ct.area === "external");
                              const hasIntermediateCoat = allExtCoats.some(
                                (ct) => ct.coatRole === "intermediate",
                              );
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
                              return (
                                <div
                                  key={li.id}
                                  className={`rounded px-2 py-1.5 text-xs ${liSelected ? "bg-white" : "opacity-50"}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={liSelected}
                                      onChange={() => {
                                        if (liSelected) {
                                          setSelectedLineItemIds(
                                            selectedLineItemIds.filter((id) => id !== li.id),
                                          );
                                        } else {
                                          setSelectedLineItemIds([...selectedLineItemIds, li.id]);
                                          if (!isSelected) {
                                            setSelectedCpoJcIds([...selectedCpoJcIds, jc.id]);
                                          }
                                          if (lineItemIssueQty[li.id] == null) {
                                            setLineItemIssueQty({
                                              ...lineItemIssueQty,
                                              [li.id]: fullQty,
                                            });
                                          }
                                        }
                                      }}
                                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0"
                                    />
                                    {itemNo != null ? (
                                      <span className="font-mono text-gray-500 shrink-0">
                                        {itemNo}
                                      </span>
                                    ) : null}
                                    <span className="text-gray-800 truncate flex-1">
                                      {itemLabel}
                                    </span>
                                    {jtNo != null ? (
                                      <span className="text-gray-400 shrink-0">JT {jtNo}</span>
                                    ) : null}
                                    {liM2 != null && liM2 > 0 ? (
                                      <span className="text-teal-700 shrink-0">
                                        {liM2.toFixed(1)} m²
                                      </span>
                                    ) : null}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={
                                          liSelected && currentIssueQty > 0
                                            ? String(currentIssueQty)
                                            : ""
                                        }
                                        disabled={!liSelected}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const raw = e.target.value.replace(/\D/g, "");
                                          const parsed = raw === "" ? 0 : parseInt(raw, 10);
                                          const val = Math.min(parsed, fullQty);
                                          setLineItemIssueQty({
                                            ...lineItemIssueQty,
                                            [li.id]: val,
                                          });
                                        }}
                                        className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-center disabled:opacity-40"
                                      />
                                      <span className="text-gray-400">/ {fullQty}</span>
                                    </div>
                                    {(() => {
                                      const liCoats = coatStatusMap[li.id];
                                      if (!liCoats) return null;
                                      const hasIntermediate = jc.coats.some(
                                        (ct) => ct.coatRole === "intermediate",
                                      );
                                      const coatTypes: Array<{ key: string; label: string }> = [
                                        { key: "primer", label: "Primer" },
                                      ];
                                      if (hasIntermediate)
                                        coatTypes.push({
                                          key: "intermediate",
                                          label: "Intermediate",
                                        });
                                      coatTypes.push({ key: "final", label: "Final" });
                                      coatTypes.push({ key: "rubber_lining", label: "Rubber" });
                                      return (
                                        <div className="flex gap-1.5 shrink-0">
                                          {coatTypes.map((ct) => {
                                            const issued = liCoats[ct.key];
                                            if (issued == null || issued === 0) return null;
                                            const done = issued >= fullQty;
                                            return (
                                              <span
                                                key={ct.key}
                                                className={`text-[9px] px-1 py-0.5 rounded ${
                                                  done
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-amber-100 text-amber-700"
                                                }`}
                                              >
                                                {ct.label}: {issued}/{fullQty}
                                                {done ? " \u2713" : ""}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  {extCoats.length > 0 || hasRubber ? (
                                    <div className="flex flex-wrap gap-1 mt-0.5 ml-6">
                                      {extCoats.map((ct) => {
                                        const roleLabel =
                                          ct.coatRole == null ? "Coat" : ct.coatRole;
                                        return (
                                          <span
                                            key={ct.product + roleLabel}
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                                          >
                                            EXT {roleLabel}: {ct.product}
                                          </span>
                                        );
                                      })}
                                      {hasRubber ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                          INT: Rubber Lining
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
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
            ) : null}

            {targetKind === "cpo" && !cpoJcLoading && cpoChildJcs.length === 0 && target != null ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No job cards found for this CPO.
              </div>
            ) : null}

            {targetKind === "cpo" && !cpoJcLoading && cpoChildJcs.length > 0 ? (
              <div className="rounded border border-gray-200 bg-white p-3 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Selection Summary — {selectedCoatsSummary.selectedJcCount}/{cpoChildJcs.length}{" "}
                  JCs · {selectedCoatsSummary.selectedM2.toFixed(1)} m²
                </h3>

                {selectedCoatsSummary.paints.length > 0 ? (
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">Paint Requirements</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {selectedCoatsSummary.paints.map((p) => {
                        const roleLabel = p.role == null ? "" : ` (${p.role})`;
                        return (
                          <div
                            key={p.product}
                            className="flex items-center justify-between rounded bg-blue-50 px-2 py-1 text-xs"
                          >
                            <span className="text-blue-900 truncate flex-1">
                              {p.product}
                              {roleLabel}
                            </span>
                            <span className="text-blue-700 font-mono font-semibold shrink-0 ml-2">
                              {p.litres.toFixed(1)} L
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    No paint specifications on selected JCs
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep("items")}
                disabled={
                  targetKind === "cpo" && cpoChildJcs.length > 0 && selectedCpoJcIds.length === 0
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
                    setCurrentStep("items");
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                >
                  Skip (clear selection)
                </button>
              ) : null}
            </div>
          </div>
        )}

        {currentStep === "items" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Items</h2>

            {targetKind === "cpo" && selectedCoatsSummary.paints.length > 0 ? (
              <div className="rounded border border-blue-200 bg-blue-50 p-3 space-y-2">
                <h3 className="text-sm font-semibold text-blue-900">CPO Paint Allocation</h3>
                <p className="text-xs text-blue-700">
                  Paint required for the selected JCs. Click a product to search stock.
                </p>
                <div className="space-y-1">
                  {selectedCoatsSummary.paints.map((p) => {
                    const roleLabel = p.role == null ? "" : ` (${p.role})`;
                    const alreadyInCart = cart.some((c) => {
                      const productName = c.product.name.toUpperCase();
                      const paintName = p.product.toUpperCase();
                      return (
                        productName.includes(paintName.slice(0, 15)) ||
                        paintName.includes(productName.slice(0, 15))
                      );
                    });
                    const priorIssued = cpoIssuedTotals.reduce((sum, t) => {
                      const issuedName = t.productName.toUpperCase();
                      const paintName = p.product.toUpperCase();
                      const matches =
                        issuedName.includes(paintName.slice(0, 15)) ||
                        paintName.includes(issuedName.slice(0, 15));
                      return matches ? sum + t.totalIssued : sum;
                    }, 0);
                    const remaining = Math.max(p.litres - priorIssued, 0);
                    const fullyIssued = priorIssued >= p.litres && priorIssued > 0;
                    const rawAllocQty = allocPaintQty[p.product];
                    const issueQty = rawAllocQty == null ? Math.ceil(remaining) : rawAllocQty;
                    return (
                      <div
                        key={p.product}
                        className={`flex items-center gap-2 rounded px-3 py-2 border ${
                          fullyIssued ? "bg-green-50 border-green-200" : "bg-white border-blue-100"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-blue-900 truncate">
                            {p.product}
                            {roleLabel}
                          </div>
                          <div className="text-xs text-blue-700">
                            {p.litres.toFixed(1)} L required
                            {priorIssued > 0 ? (
                              <span className="ml-1 text-green-700 font-medium">
                                ({Math.round(priorIssued * 100) / 100}L already issued
                                {fullyIssued
                                  ? " - COMPLETE"
                                  : `, ${remaining.toFixed(1)}L remaining`}
                                )
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <label className="text-[10px] text-gray-500 uppercase">Issue L</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={issueQty > 0 ? String(issueQty) : ""}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              const val = raw === "" ? 0 : parseInt(raw, 10);
                              setAllocPaintQty({ ...allocPaintQty, [p.product]: val });
                            }}
                            className="w-16 border border-gray-300 rounded px-1.5 py-1 text-sm text-center"
                            disabled={alreadyInCart || fullyIssued}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingAllocQty(issueQty);
                            setSearch(p.product.split(" ").slice(0, 3).join(" "));
                          }}
                          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded ${
                            fullyIssued
                              ? "bg-green-100 text-green-700"
                              : alreadyInCart
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                          disabled={alreadyInCart || fullyIssued}
                        >
                          {fullyIssued ? "Issued" : alreadyInCart ? "In cart" : "Find & add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={config.label("issueStock.itemPicker.searchPlaceholder")}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              {isPhotoEnabled && (
                <label className="px-4 py-2 bg-amber-500 text-white rounded text-sm font-medium cursor-pointer">
                  📷 {photoCapturing ? "..." : config.label("issueStock.itemPicker.cameraButton")}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {photoResult && photoResult.matches.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3">
                <div className="text-xs font-semibold text-amber-900 mb-2">Photo matches:</div>
                <div className="space-y-1">
                  {photoResult.matches.map((m) => (
                    <button
                      key={m.productId}
                      type="button"
                      onClick={() => {
                        const product = products.find((p) => p.id === m.productId);
                        if (product) addToCart(product);
                        setPhotoResult(null);
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-amber-100 text-xs"
                    >
                      <span className="font-mono">{m.sku}</span> · {m.name} ({m.productType})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {search.trim() === "" && !photoResult ? (
              <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
                Type to search for consumables, paint, or rubber rolls
              </div>
            ) : null}

            {search.trim() !== "" || photoResult ? (
              <div className="rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                {isLoading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
                {!isLoading && products.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">No products found</div>
                )}
                {products.map((p) => {
                  const inCart = cart.some((c) => c.product.id === p.id);
                  const rawUom = p.unitOfMeasure;
                  const uom = rawUom == null ? "each" : rawUom;
                  const paintDetail = p.paint;
                  const packSize = paintDetail == null ? null : paintDetail.packSizeLitres;
                  const packLabel = packSize != null ? ` (${packSize}L per tin)` : "";
                  const compRole = paintDetail == null ? null : paintDetail.componentRole;
                  const roleLabel = compRole != null ? ` · ${compRole}` : "";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={inCart}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-500">
                            {p.sku} · {p.productType}
                            {roleLabel} · Qty: {p.quantity} {uom}
                            {packLabel}
                          </div>
                        </div>
                        <span className="text-xs text-teal-700">
                          {inCart ? "In cart" : "Add +"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {cart.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Cart ({cart.length})</h3>
                <div className="rounded-lg border border-gray-200 divide-y">
                  {cart.map((row) => (
                    <div key={row.product.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{row.product.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {row.product.sku} · {row.product.productType}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(row.product.id)}
                          className="shrink-0 text-red-600 text-xs hover:underline px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                      {(() => {
                        const paintDetail = row.product.paint;
                        const numParts = paintDetail == null ? null : paintDetail.numberOfParts;
                        const ratioStr = paintDetail == null ? null : paintDetail.mixingRatio;
                        const packSizeA = paintDetail == null ? null : paintDetail.packSizeLitres;
                        const kit = kitSizeForProduct(row.product);
                        const isMultiPart =
                          numParts != null && numParts > 1 && ratioStr != null && kit != null;
                        const productId = row.product.id;
                        const rawLinked = linkedPartsMap[productId];
                        const linkedParts = rawLinked || [];

                        const ratioParts = isMultiPart ? ratioStr.split(":").map(Number) : [];
                        const rawRatioA = ratioParts[0];
                        const rawRatioB = ratioParts[1];
                        const ratioA = rawRatioA == null || Number.isNaN(rawRatioA) ? 1 : rawRatioA;
                        const ratioB = rawRatioB == null || Number.isNaN(rawRatioB) ? 0 : rawRatioB;
                        const totalRatio = ratioA + ratioB;

                        const numKits = isMultiPart ? Math.round(row.quantity / kit) : 0;
                        const partAPerKit = packSizeA || 0;
                        const partBPerKit = isMultiPart ? partAPerKit * (ratioB / ratioA) : 0;
                        const tinsA = numKits;
                        const tinsB = numKits;
                        const totalPartA = tinsA * partAPerKit;
                        const totalPartB = tinsB * partBPerKit;
                        const grandTotal = totalPartA + totalPartB;

                        const partBProduct = linkedParts.find((lp) => {
                          const lpPaint = lp.paint;
                          const role = lpPaint == null ? null : lpPaint.componentRole;
                          return role === "hardener" || role === "Hardener" || role === "Part B";
                        });
                        const partBName =
                          partBProduct == null ? "Part B (Hardener)" : partBProduct.name;
                        const partBPaint = partBProduct == null ? null : partBProduct.paint;
                        const partBPackSize = partBPaint == null ? null : partBPaint.packSizeLitres;
                        const partBStock = partBProduct == null ? null : partBProduct.quantity;

                        if (isMultiPart) {
                          const rowQty = row.quantity;
                          const snapped = snapToKit(rowQty, kit);
                          const snapDown = snapped.down;
                          const snapUp = snapped.up;
                          const kitsDown = Math.round(snapDown / kit);
                          const kitsUp = Math.round(snapUp / kit);
                          const isExactKit = rowQty === snapDown || rowQty === snapUp;
                          return (
                            <div className="space-y-2">
                              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs space-y-2">
                                <div className="font-semibold text-blue-900">
                                  Kit size: {kit}L (mix {ratioStr}) — {partAPerKit}L Part A +{" "}
                                  {partBPerKit}L Part B
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newKits = Math.max(numKits - 1, 1);
                                      updateCartRow(row.product.id, { quantity: newKits * kit });
                                    }}
                                    className="w-7 h-7 rounded bg-blue-200 text-blue-900 font-bold hover:bg-blue-300 text-sm"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono text-blue-900 font-semibold min-w-[80px] text-center">
                                    {numKits} kit{numKits !== 1 ? "s" : ""} = {grandTotal}L
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newKits = numKits + 1;
                                      updateCartRow(row.product.id, { quantity: newKits * kit });
                                    }}
                                    className="w-7 h-7 rounded bg-blue-200 text-blue-900 font-bold hover:bg-blue-300 text-sm"
                                  >
                                    +
                                  </button>
                                  {!isExactKit ? (
                                    <span className="text-amber-700 text-[10px]">
                                      (was {rowQty}L — snapped to nearest kit)
                                    </span>
                                  ) : null}
                                </div>
                                <div className="border-t border-blue-200 pt-1 space-y-0.5">
                                  <div className="flex justify-between text-blue-800">
                                    <span>
                                      Part A: {row.product.name} ({partAPerKit}L/tin)
                                    </span>
                                    <span className="font-mono">
                                      {tinsA} tin{tinsA !== 1 ? "s" : ""} = {totalPartA}L
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-blue-800">
                                    <span>
                                      Part B: {partBName}
                                      {partBPackSize != null ? ` (${partBPackSize}L/tin)` : ""}
                                      {partBStock != null ? (
                                        <span className="text-gray-500 ml-1">
                                          [{partBStock} in stock]
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="font-mono">
                                      {tinsB} tin{tinsB !== 1 ? "s" : ""} = {totalPartB}L
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-blue-900 font-semibold border-t border-blue-200 pt-1">
                                    <span>Total mixed</span>
                                    <span className="font-mono">{grandTotal}L</span>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs space-y-1">
                                <div className="font-semibold text-gray-700">
                                  Batch numbers per tin
                                </div>
                                <div className="text-[10px] text-gray-500 mb-1">
                                  Part A tins ({partAPerKit}L each)
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                                  {Array.from({ length: tinsA }).map((_, i) => {
                                    const rawBatch = row.tinBatchNumbers[i];
                                    const batchVal = rawBatch == null ? "" : rawBatch;
                                    return (
                                      <input
                                        key={`a-${i}`}
                                        type="text"
                                        value={batchVal}
                                        onChange={(e) => {
                                          const updated = [...row.tinBatchNumbers];
                                          updated[i] = e.target.value;
                                          updateCartRow(row.product.id, {
                                            tinBatchNumbers: updated,
                                          });
                                        }}
                                        placeholder={`A${i + 1} batch`}
                                        className="border border-gray-300 rounded px-1.5 py-1 text-xs"
                                      />
                                    );
                                  })}
                                </div>
                                {tinsB > 0 ? (
                                  <>
                                    <div className="text-[10px] text-gray-500 mt-1">
                                      Part B tins ({partBPerKit}L each)
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                                      {Array.from({ length: tinsB }).map((_, i) => {
                                        const idx = tinsA + i;
                                        const rawBatchB = row.tinBatchNumbers[idx];
                                        const batchVal = rawBatchB == null ? "" : rawBatchB;
                                        return (
                                          <input
                                            key={`b-${i}`}
                                            type="text"
                                            value={batchVal}
                                            onChange={(e) => {
                                              const updated = [...row.tinBatchNumbers];
                                              updated[idx] = e.target.value;
                                              updateCartRow(row.product.id, {
                                                tinBatchNumbers: updated,
                                              });
                                            }}
                                            placeholder={`B${i + 1} batch`}
                                            className="border border-gray-300 rounded px-1.5 py-1 text-xs"
                                          />
                                        );
                                      })}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          );
                        }

                        if (packSizeA != null && row.product.productType === "paint") {
                          const tinsNeeded = Math.ceil(row.quantity / packSizeA);
                          return (
                            <div className="space-y-2">
                              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                                {packSizeA}L per tin x {tinsNeeded} tins ={" "}
                                {(tinsNeeded * packSizeA).toFixed(1)}L (single pack)
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                                    Qty (L)
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={row.quantity}
                                    onChange={(e) =>
                                      updateCartRow(row.product.id, {
                                        quantity: Number(e.target.value),
                                      })
                                    }
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                                    Batch #
                                  </label>
                                  <input
                                    type="text"
                                    value={row.batchNumber}
                                    onChange={(e) =>
                                      updateCartRow(row.product.id, { batchNumber: e.target.value })
                                    }
                                    placeholder="optional"
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                                Qty
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateCartRow(row.product.id, {
                                    quantity: Number(e.target.value),
                                  })
                                }
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                                Batch #
                              </label>
                              <input
                                type="text"
                                value={row.batchNumber}
                                onChange={(e) =>
                                  updateCartRow(row.product.id, { batchNumber: e.target.value })
                                }
                                placeholder="optional"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })()}
                      {row.product.productType === "paint" && showPaintProRata ? (
                        <PaintProRataSplitEditor
                          totalLitres={row.quantity}
                          jobCards={cpoJobCards}
                          splits={row.paintSplits}
                          onChange={(splits) =>
                            updateCartRow(row.product.id, { paintSplits: splits })
                          }
                        />
                      ) : null}
                      {row.product.productType === "rubber_roll" ? (
                        <RubberRollSubEditor
                          value={row.rubberRollDetails}
                          productName={row.product.name}
                          onChange={(details) =>
                            updateCartRow(row.product.id, { rubberRollDetails: details })
                          }
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const dismissed = localStorage.getItem("sm_skip_confirm_warning");
                if (dismissed === "true") {
                  setCurrentStep("confirm");
                } else {
                  setShowConfirmWarning(true);
                }
              }}
              disabled={cart.length === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next → Confirm
            </button>

            {showConfirmWarning
              ? createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div
                      className="fixed inset-0 bg-black/10 backdrop-blur-md"
                      onClick={() => setShowConfirmWarning(false)}
                      aria-hidden="true"
                    />
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Add all items before proceeding
                      </h3>
                      <p className="text-sm text-gray-600">
                        Make sure you have added all products for this dispatch before confirming.
                        Once submitted, you cannot add more items to this issuance session.
                      </p>
                      <label className="flex items-center gap-2 text-sm text-gray-500">
                        <input
                          type="checkbox"
                          checked={dontShowAgainChecked}
                          onChange={(e) => setDontShowAgainChecked(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Do not show this again
                      </label>
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => setShowConfirmWarning(false)}
                          className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Go back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (dontShowAgainChecked) {
                              localStorage.setItem("sm_skip_confirm_warning", "true");
                            }
                            setShowConfirmWarning(false);
                            setCurrentStep("confirm");
                          }}
                          className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium hover:bg-teal-700"
                        >
                          Proceed to confirm
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>
        )}

        {currentStep === "confirm" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm Issuance</h2>
            <div className="text-sm space-y-1">
              <div>Issuer: Staff #{issuerStaffId}</div>
              <div>Recipient: Staff #{recipientStaffId}</div>
              {target != null ? (
                <div>
                  {target.kind === "cpo" ? "CPO" : "Job Card"}: {target.label}
                  {target.kind === "cpo" && selectedCpoJcIds.length > 0 ? (
                    <div className="text-xs text-gray-500 mt-1">
                      Job Cards:{" "}
                      {cpoChildJcs
                        .filter((jc) => selectedCpoJcIds.includes(jc.id))
                        .map((jc) => (jc.jcNumber == null ? jc.jobNumber : jc.jcNumber))
                        .join(", ")}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-gray-200 divide-y">
              {cart.map((row) => (
                <div key={row.product.id} className="p-3 text-sm flex justify-between">
                  <span>{row.product.name}</span>
                  <span className="font-mono">
                    {Math.round(row.quantity * 100) / 100} {row.product.unitOfMeasure}
                  </span>
                </div>
              ))}
            </div>
            {submitSuccess ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                Issuance created successfully. Returning to start...
              </div>
            ) : null}
            {submitError != null ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Error: {submitError}
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="ml-2 text-red-600 hover:underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
            {!submitSuccess ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep("items")}
                  className="px-4 py-2 border border-gray-300 rounded text-sm"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Issuance"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueStockPage;
