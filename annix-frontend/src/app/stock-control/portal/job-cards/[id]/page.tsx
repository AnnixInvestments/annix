"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CoatingAnalysis,
  JobCard,
  JobCardApproval,
  JobCardAttachment,
  JobCardVersion,
  Requisition,
  StaffMember,
  StockAllocation,
  StockItem,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { ApprovalModal } from "@/app/stock-control/components/ApprovalModal";
import { PhotoCapture } from "@/app/stock-control/components/PhotoCapture";
import { WorkflowStatus } from "@/app/stock-control/components/WorkflowStatus";
import {
  type CuttingPlan,
  calculateCuttingPlan,
  type RollAllocation,
} from "@/app/stock-control/lib/rubberCuttingCalculator";

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  draft: [
    { label: "Activate", next: "active", color: "bg-green-600 hover:bg-green-700" },
    { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  active: [
    { label: "Complete", next: "completed", color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  completed: [],
  cancelled: [{ label: "Reinstate", next: "draft", color: "bg-amber-600 hover:bg-amber-700" }],
};

const INVALID_LINE_ITEM_PATTERNS = [
  /^production$/i,
  /^foreman?\s*sign/i,
  /^forman\s*sign/i,
  /^material\s*spec/i,
  /^job\s*comp\s*date/i,
  /^completion\s*date/i,
  /^supervisor/i,
  /^quality\s*control/i,
  /^qc\s*sign/i,
  /^inspector/i,
  /^approved\s*by/i,
  /^checked\s*by/i,
  /^date$/i,
  /^signature$/i,
  /^sign$/i,
  /^remarks$/i,
  /^comments$/i,
  /^notes$/i,
];

function isValidLineItem(li: {
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  jtNo: string | null;
}): boolean {
  const itemCode = (li.itemCode || "").trim();
  const description = (li.itemDescription || "").trim();
  const textToCheck = itemCode || description;

  if (!textToCheck) {
    return false;
  }

  const isFormLabel = INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(textToCheck));
  if (isFormLabel) {
    return false;
  }

  const qty = li.quantity;
  const hasNoData =
    !li.itemDescription && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  if (hasNoData && itemCode) {
    const looksLikeLabel = /^[A-Za-z\s]+$/.test(itemCode) && itemCode.length < 30;
    if (looksLikeLabel) {
      return false;
    }
  }

  return true;
}

const STANDARD_ROLL_WIDTH_MM = 1200;
const STANDARD_ROLL_LENGTH_M = 12.5;
const STANDARD_ROLL_AREA_M2 = (STANDARD_ROLL_WIDTH_MM / 1000) * STANDARD_ROLL_LENGTH_M;

const CUT_COLORS = [
  "bg-blue-500",
  "bg-teal-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-emerald-500",
];

interface RubberAllocationProps {
  lineItems: Array<{
    id?: number;
    m2: number | null;
    itemCode: string | null;
    itemDescription: string | null;
    itemNo?: string | null;
    quantity: number | null;
  }>;
}

function CuttingDiagram({
  roll,
  colorMap,
}: {
  roll: RollAllocation;
  colorMap: Map<string, string>;
}) {
  const rollLengthMm = roll.rollSpec.lengthM * 1000;
  const lanes = roll.rollSpec.lanes;
  const laneHeight = 100 / lanes;

  const cutsByLane: Map<number, typeof roll.cuts> = new Map();
  for (let i = 0; i < lanes; i++) {
    cutsByLane.set(i, []);
  }
  for (const cut of roll.cuts) {
    const laneCuts = cutsByLane.get(cut.lane) || [];
    laneCuts.push(cut);
    cutsByLane.set(cut.lane, laneCuts);
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-gray-900">
            Roll {roll.rollIndex}: {roll.rollSpec.widthMm}mm x {roll.rollSpec.lengthM}m
          </span>
          {roll.hasLengthwiseCut && (
            <span className="ml-2 text-xs text-amber-600 font-medium">
              (Cut lengthwise into {lanes} strips of {roll.rollSpec.laneWidthMm}mm each)
            </span>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            roll.wastePercentage < 10
              ? "bg-green-100 text-green-800"
              : roll.wastePercentage < 25
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {(100 - roll.wastePercentage).toFixed(0)}% used
        </span>
      </div>

      <div
        className="relative bg-gray-100 rounded border border-gray-300 overflow-hidden"
        style={{ height: `${Math.max(48, lanes * 32)}px` }}
      >
        {roll.hasLengthwiseCut &&
          Array.from({ length: lanes - 1 }, (_, i) => (
            <div
              key={`divider-${i}`}
              className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10"
              style={{ top: `${((i + 1) * 100) / lanes}%` }}
            />
          ))}

        {Array.from(cutsByLane.entries()).map(([lane, cuts]) => {
          const laneTop = (lane * 100) / lanes;
          let usedLength = 0;
          for (const c of cuts) {
            usedLength = Math.max(usedLength, c.positionMm + c.lengthMm);
          }
          const wasteStart = (usedLength / rollLengthMm) * 100;
          const wasteWidth = 100 - wasteStart;

          return (
            <div key={lane}>
              {cuts.map((cut, idx) => {
                const left = (cut.positionMm / rollLengthMm) * 100;
                const width = (cut.lengthMm / rollLengthMm) * 100;
                const colorClass =
                  colorMap.get(cut.itemId.split("-")[0]) || CUT_COLORS[idx % CUT_COLORS.length];
                const displayLabel = cut.itemNo || `${(cut.lengthMm / 1000).toFixed(1)}m`;

                return (
                  <div
                    key={cut.itemId}
                    className={`absolute ${colorClass} border-r border-b border-white flex items-center justify-center`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${laneTop}%`,
                      height: `${laneHeight}%`,
                    }}
                    title={`${cut.itemNo ? `[${cut.itemNo}] ` : ""}${cut.description}: ${(cut.lengthMm / 1000).toFixed(2)}m`}
                  >
                    <span className="text-[10px] text-white font-bold truncate px-1">
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
              {wasteWidth > 1 && (
                <div
                  className="absolute bg-gray-300 flex items-center justify-center"
                  style={{
                    left: `${wasteStart}%`,
                    width: `${wasteWidth}%`,
                    top: `${laneTop}%`,
                    height: `${laneHeight}%`,
                  }}
                >
                  <span className="text-[9px] text-gray-600 font-medium">
                    {((rollLengthMm - usedLength) / 1000).toFixed(1)}m
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        <div className="text-xs text-gray-500 mb-1">Cut List:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {roll.cuts.map((cut, idx) => {
            const colorClass =
              colorMap.get(cut.itemId.split("-")[0]) || CUT_COLORS[idx % CUT_COLORS.length];
            return (
              <div
                key={cut.itemId}
                className="flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-1"
              >
                <div className={`w-3 h-3 rounded flex-shrink-0 ${colorClass}`} />
                <span className="font-mono font-semibold text-gray-800 flex-shrink-0">
                  {cut.itemNo || "-"}
                </span>
                <span className="text-gray-400 flex-shrink-0">|</span>
                <span className="text-gray-600 flex-shrink-0">
                  {(cut.lengthMm / 1000).toFixed(2)}m
                </span>
                {lanes > 1 && (
                  <>
                    <span className="text-gray-400 flex-shrink-0">|</span>
                    <span className="text-gray-500 flex-shrink-0">Lane {cut.lane + 1}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PipeCuttingView({ plan }: { plan: CuttingPlan }) {
  const colorMap = new Map<string, string>();
  let colorIdx = 0;

  for (const roll of plan.rolls) {
    for (const cut of roll.cuts) {
      const baseId = cut.itemId.split("-")[0];
      if (!colorMap.has(baseId)) {
        colorMap.set(baseId, CUT_COLORS[colorIdx % CUT_COLORS.length]);
        colorIdx++;
      }
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600">Total Used</p>
          <p className="text-2xl font-bold text-blue-900">{plan.totalUsedSqM.toFixed(2)} m&#178;</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4">
          <p className="text-sm font-medium text-teal-600">Rolls Required</p>
          <p className="text-2xl font-bold text-teal-900">{plan.totalRollsNeeded}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-600">Waste</p>
          <p className="text-2xl font-bold text-amber-900">
            {plan.totalWasteSqM.toFixed(2)} m&#178;
          </p>
          <p className="text-xs text-amber-600 mt-1">({plan.wastePercentage.toFixed(1)}%)</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600">Efficiency</p>
          <p className="text-2xl font-bold text-green-900">
            {(100 - plan.wastePercentage).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Cutting Diagram</h4>
        <p className="text-xs text-gray-500 mb-3">
          Each colored section represents a pipe piece. Cut marks show where to cut the roll.
        </p>
        {plan.rolls.map((roll) => (
          <CuttingDiagram key={roll.rollIndex} roll={roll} colorMap={colorMap} />
        ))}
      </div>
    </div>
  );
}

function GenericM2View({
  totalM2,
  items,
}: {
  totalM2: number;
  items: { description: string; m2: number }[];
}) {
  const rollsNeededExact = totalM2 / STANDARD_ROLL_AREA_M2;
  const fullRollsNeeded = Math.ceil(rollsNeededExact);
  const totalRollArea = fullRollsNeeded * STANDARD_ROLL_AREA_M2;
  const leftoverM2 = totalRollArea - totalM2;
  const lastRollUsedM2 = STANDARD_ROLL_AREA_M2 - leftoverM2;
  const lastRollUsedPercent = (lastRollUsedM2 / STANDARD_ROLL_AREA_M2) * 100;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Standard tank work rolls: {STANDARD_ROLL_WIDTH_MM}mm x {STANDARD_ROLL_LENGTH_M}m ={" "}
        {STANDARD_ROLL_AREA_M2.toFixed(2)} m&#178; per roll
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600">Total Required</p>
          <p className="text-2xl font-bold text-blue-900">{totalM2.toFixed(2)} m&#178;</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-4">
          <p className="text-sm font-medium text-teal-600">Rolls Required</p>
          <p className="text-2xl font-bold text-teal-900">{fullRollsNeeded}</p>
          <p className="text-xs text-teal-600 mt-1">({totalRollArea.toFixed(2)} m&#178; total)</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-600">Last Roll Usage</p>
          <p className="text-2xl font-bold text-amber-900">{lastRollUsedPercent.toFixed(0)}%</p>
          <p className="text-xs text-amber-600 mt-1">({lastRollUsedM2.toFixed(2)} m&#178; used)</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm font-medium text-green-600">Leftover</p>
          <p className="text-2xl font-bold text-green-900">{leftoverM2.toFixed(2)} m&#178;</p>
          <p className="text-xs text-green-600 mt-1">from last roll</p>
        </div>
      </div>

      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Roll Breakdown</h4>
        <div className="space-y-2">
          {Array.from({ length: fullRollsNeeded }, (_, i) => {
            const rollNum = i + 1;
            const isLastRoll = rollNum === fullRollsNeeded;
            const usedPercent = isLastRoll ? lastRollUsedPercent : 100;
            const usedM2 = isLastRoll ? lastRollUsedM2 : STANDARD_ROLL_AREA_M2;

            return (
              <div key={rollNum} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-16">Roll {rollNum}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isLastRoll ? "bg-amber-500" : "bg-teal-500"}`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-24 text-right">
                  {usedM2.toFixed(2)} m&#178;
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isLastRoll ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                  }`}
                >
                  {usedPercent.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RubberAllocationSection({ lineItems }: RubberAllocationProps) {
  const plan = calculateCuttingPlan(
    lineItems.map((li, idx) => ({
      id: li.id || idx,
      itemCode: li.itemCode,
      itemDescription: li.itemDescription,
      quantity: li.quantity,
      m2: li.m2,
    })),
  );

  const totalM2Required = lineItems.reduce((sum, li) => sum + (li.m2 ? Number(li.m2) : 0), 0);

  if (totalM2Required === 0 && !plan.hasPipeItems) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Rubber Allocation</h3>
        {plan.hasPipeItems && (
          <p className="mt-1 text-sm text-gray-500">
            Pipe dimensions detected. Rubber width calculated from pipe ID (circumference). Roll
            widths: 800-1450mm (50mm increments). Lengths: 8-12.5m (0.5m increments).
          </p>
        )}
      </div>
      <div className="px-4 py-5 sm:px-6">
        {plan.hasPipeItems ? (
          <PipeCuttingView plan={plan} />
        ) : (
          <GenericM2View totalM2={plan.genericM2Total} items={plan.genericM2Items} />
        )}

        {plan.hasPipeItems && plan.genericM2Total > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Additional Items (m&#178; only)
            </h4>
            <GenericM2View totalM2={plan.genericM2Total} items={plan.genericM2Items} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useStockControlAuth();
  const jobId = Number(params.id);

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusData | null>(null);
  const [approvals, setApprovals] = useState<JobCardApproval[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentApprovalStep, setCurrentApprovalStep] = useState("");
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [coatingAnalysis, setCoatingAnalysis] = useState<CoatingAnalysis | null>(null);
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    stockItemId: 0,
    quantityUsed: 1,
    notes: "",
    staffMemberId: 0,
  });
  const [isAllocating, setIsAllocating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [approvingAllocationId, setApprovingAllocationId] = useState<number | null>(null);
  const [rejectingAllocationId, setRejectingAllocationId] = useState<number | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [versions, setVersions] = useState<JobCardVersion[]>([]);
  const [attachments, setAttachments] = useState<JobCardAttachment[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentNotes, setAmendmentNotes] = useState("");
  const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
  const [isUploadingAmendment, setIsUploadingAmendment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isExtracting, setIsExtracting] = useState<number | null>(null);
  const [isDraggingAmendment, setIsDraggingAmendment] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobData, allocationsData] = await Promise.all([
        stockControlApiClient.jobCardById(jobId),
        stockControlApiClient.jobCardAllocations(jobId),
      ]);
      setJobCard(jobData);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setError(null);

      stockControlApiClient
        .jobCardCoatingAnalysis(jobId)
        .then((data) => setCoatingAnalysis(data))
        .catch(() => setCoatingAnalysis(null));

      stockControlApiClient
        .requisitions()
        .then((reqs) => {
          const match = reqs.find((r) => r.jobCardId === jobId && r.status !== "cancelled");
          setRequisition(match ?? null);
        })
        .catch(() => setRequisition(null));

      stockControlApiClient
        .jobCardVersionHistory(jobId)
        .then((data) => setVersions(data))
        .catch(() => setVersions([]));

      stockControlApiClient
        .jobCardAttachments(jobId)
        .then((data) => setAttachments(data))
        .catch(() => setAttachments([]));

      stockControlApiClient
        .workflowStatus(jobId)
        .then((data) => setWorkflowStatus(data))
        .catch(() => setWorkflowStatus(null));

      stockControlApiClient
        .approvalHistory(jobId)
        .then((data) => setApprovals(data))
        .catch(() => setApprovals([]));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load job card"));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchStockItems = async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stock items"));
    }
  };

  const openAllocateModal = async () => {
    await fetchStockItems();
    try {
      const staff = await stockControlApiClient.staffMembers({ active: "true" });
      setActiveStaff(Array.isArray(staff) ? staff : []);
    } catch {
      setActiveStaff([]);
    }
    setAllocateForm({ stockItemId: 0, quantityUsed: 1, notes: "", staffMemberId: 0 });
    setCapturedFile(null);
    setShowAllocateModal(true);
  };

  const handleAllocate = async () => {
    if (!allocateForm.stockItemId) return;
    try {
      setIsAllocating(true);
      const allocation = await stockControlApiClient.allocateStock(jobId, {
        stockItemId: allocateForm.stockItemId,
        quantityUsed: allocateForm.quantityUsed,
        notes: allocateForm.notes || undefined,
        staffMemberId: allocateForm.staffMemberId || undefined,
      });
      if (capturedFile) {
        await stockControlApiClient.uploadAllocationPhoto(jobId, allocation.id, capturedFile);
      }
      setShowAllocateModal(false);
      setCapturedFile(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to allocate stock"));
    } finally {
      setIsAllocating(false);
    }
  };

  const handleApproveAllocation = async (allocationId: number) => {
    try {
      setApprovingAllocationId(allocationId);
      await stockControlApiClient.approveOverAllocation(jobId, allocationId);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to approve allocation"));
    } finally {
      setApprovingAllocationId(null);
    }
  };

  const handleRejectAllocation = async (allocationId: number, reason: string) => {
    if (!reason.trim()) return;
    try {
      setRejectingAllocationId(allocationId);
      await stockControlApiClient.rejectOverAllocation(jobId, allocationId, reason);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reject allocation"));
    } finally {
      setRejectingAllocationId(null);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setIsAnalysing(true);
      const result = await stockControlApiClient.triggerCoatingAnalysis(jobId);
      setCoatingAnalysis(result && "id" in result ? result : null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Coating analysis failed"));
    } finally {
      setIsAnalysing(false);
    }
  };

  const handlePrintQr = async () => {
    try {
      setIsDownloadingQr(true);
      await stockControlApiClient.downloadJobCardQrPdf(jobId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download job card PDF"));
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await stockControlApiClient.updateJobCard(jobId, { status: newStatus });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleApprove = async (signatureDataUrl?: string, comments?: string) => {
    await stockControlApiClient.approveWorkflowStep(jobId, {
      signatureDataUrl,
      comments,
    });
    fetchData();
  };

  const handleReject = async (reason: string) => {
    await stockControlApiClient.rejectWorkflowStep(jobId, reason);
    fetchData();
  };

  const openApprovalModal = (stepName: string) => {
    setCurrentApprovalStep(stepName);
    setShowApprovalModal(true);
  };

  const handlePrintSignedPdf = async () => {
    try {
      await stockControlApiClient.downloadSignedJobCardPdf(jobId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to download signed PDF"));
    }
  };

  const handleAmendmentUpload = async () => {
    if (!amendmentFile) return;
    try {
      setIsUploadingAmendment(true);
      await stockControlApiClient.uploadJobCardAmendment(
        jobId,
        amendmentFile,
        amendmentNotes || undefined,
      );
      setShowAmendmentModal(false);
      setAmendmentFile(null);
      setAmendmentNotes("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload amendment"));
    } finally {
      setIsUploadingAmendment(false);
    }
  };

  const handleAttachmentUpload = async () => {
    if (!attachmentFile) return;
    try {
      setIsUploadingAttachment(true);
      await stockControlApiClient.uploadJobCardAttachment(
        jobId,
        attachmentFile,
        attachmentNotes || undefined,
      );
      setAttachmentFile(null);
      setAttachmentNotes("");
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload attachment"));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleTriggerExtraction = async (attachmentId: number) => {
    try {
      setIsExtracting(attachmentId);
      await stockControlApiClient.triggerDrawingExtraction(jobId, attachmentId);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Extraction failed"));
    } finally {
      setIsExtracting(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      await stockControlApiClient.deleteJobCardAttachment(jobId, attachmentId);
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete attachment"));
    }
  };

  const handleAmendmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAmendment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setAmendmentFile(files[0]);
    }
  };

  const handleAmendmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingAmendment(true);
  };

  const handleAmendmentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingAmendment(false);
    }
  };

  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setAttachmentFile(files[0]);
    }
  };

  const handleAttachmentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingAttachment(true);
  };

  const handleAttachmentDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingAttachment(false);
    }
  };

  const extractionStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      processing: "bg-blue-100 text-blue-800",
      analysed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job card...</p>
        </div>
      </div>
    );
  }

  if (error || !jobCard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Job card not found"}</p>
          <Link
            href="/stock-control/portal/job-cards"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Job Cards
          </Link>
        </div>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[jobCard.status.toLowerCase()] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/stock-control/portal/job-cards"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{jobCard.jobNumber}</h1>
              {jobCard.versionNumber && jobCard.versionNumber > 1 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  v{jobCard.versionNumber}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
              >
                {jobCard.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{jobCard.jobName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintQr}
            disabled={isDownloadingQr}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            {isDownloadingQr ? "Generating..." : "Print QR"}
          </button>
          {transitions.map((transition) => (
            <button
              key={transition.next}
              onClick={() => handleStatusUpdate(transition.next)}
              disabled={isUpdatingStatus}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${transition.color}`}
            >
              {transition.label}
            </button>
          ))}
          {workflowStatus?.canApprove && workflowStatus.currentStep && (
            <button
              onClick={() => openApprovalModal(workflowStatus.currentStep!)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Review &amp; Approve
            </button>
          )}
          {workflowStatus?.currentStatus === "ready_for_dispatch" && (
            <>
              <button
                onClick={handlePrintSignedPdf}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Signed JC
              </button>
              <Link
                href={`/stock-control/portal/job-cards/${jobId}/dispatch`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                Start Dispatch
              </Link>
            </>
          )}
          {jobCard.status === "active" && (
            <button
              onClick={openAllocateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Allocate Stock
            </button>
          )}
        </div>
      </div>

      {workflowStatus && workflowStatus.currentStatus !== "draft" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WorkflowStatus currentStatus={workflowStatus.currentStatus} approvals={approvals} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Actions</h3>
            {workflowStatus.canApprove && workflowStatus.currentStep ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  This job card is awaiting your approval at the{" "}
                  <span className="font-medium">
                    {workflowStatus.currentStep.replace(/_/g, " ")}
                  </span>{" "}
                  step.
                </p>
                <button
                  onClick={() => openApprovalModal(workflowStatus.currentStep!)}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                >
                  Review &amp; Approve
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {workflowStatus.currentStatus === "dispatched" ? (
                  <p className="text-green-600 font-medium">
                    This job card has been fully dispatched.
                  </p>
                ) : (
                  <p>Awaiting action from another role.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Job Card Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">JC Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jcNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Page Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.pageNumber || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.customerName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}
                >
                  {jobCard.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.updatedAt)}</dd>
            </div>
            {jobCard.description && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.description}</dd>
              </div>
            )}
            {jobCard.poNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.poNumber}</dd>
              </div>
            )}
            {jobCard.siteLocation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Site / Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.siteLocation}</dd>
              </div>
            )}
            {jobCard.contactPerson && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.contactPerson}</dd>
              </div>
            )}
            {jobCard.dueDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.dueDate}</dd>
              </div>
            )}
            {jobCard.reference && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Reference</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.reference}</dd>
              </div>
            )}
            {jobCard.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{jobCard.notes}</dd>
              </div>
            )}
          </dl>
          {coatingAnalysis &&
            coatingAnalysis.status === "analysed" &&
            coatingAnalysis.coats.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">Coating Specification</h4>
                    <span className="text-xs text-gray-400 italic">extracted by Nix</span>
                  </div>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={isAnalysing}
                    className="text-xs text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                  >
                    {isAnalysing ? "Analysing..." : "Re-analyse"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
                  {coatingAnalysis.applicationType && (
                    <div>
                      <span className="font-medium text-gray-500">Application: </span>
                      <span className="text-gray-900 capitalize">
                        {coatingAnalysis.applicationType}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.surfacePrep && (
                    <div>
                      <span className="font-medium text-gray-500">Surface Prep: </span>
                      <span className="text-gray-900 capitalize">
                        {coatingAnalysis.surfacePrep.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.extM2 > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">Ext m&#178;: </span>
                      <span className="text-gray-900">
                        {Number(coatingAnalysis.extM2).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {coatingAnalysis.intM2 > 0 && (
                    <div>
                      <span className="font-medium text-gray-500">Int m&#178;: </span>
                      <span className="text-gray-900">
                        {Number(coatingAnalysis.intM2).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Area</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Product</th>
                      <th className="text-right py-2 pr-4 font-medium text-gray-500">
                        DFT (&#181;m)
                      </th>
                      <th className="text-right py-2 pr-4 font-medium text-gray-500">
                        Coverage (m&#178;/L)
                      </th>
                      <th className="text-right py-2 font-medium text-gray-500">Litres Req.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coatingAnalysis.coats.map((coat, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-600 capitalize">
                          {coat.area === "external" ? "Ext" : "Int"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900 font-medium">{coat.product}</td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {coat.minDftUm}-{coat.maxDftUm}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-900">
                          {coat.coverageM2PerLiter}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          {coat.litersRequired}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {coatingAnalysis.stockAssessment.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Stock Assessment
                    </h5>
                    <div className="space-y-1">
                      {coatingAnalysis.stockAssessment.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.product}</span>
                          <div className="flex items-center space-x-3">
                            {item.stockItemId ? (
                              <>
                                <span className="text-gray-500">
                                  {item.currentStock} / {item.required} {item.unit}
                                </span>
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    item.sufficient
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.sufficient ? "OK" : "Short"}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-600 italic">
                                Not in inventory
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          {coatingAnalysis && coatingAnalysis.status === "pending" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                <span>Nix is analysing the coating specification...</span>
              </div>
            </div>
          )}
          {coatingAnalysis && coatingAnalysis.status === "failed" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-600">
                  Coating analysis failed: {coatingAnalysis.error || "Unknown error"}
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalysing}
                  className="text-sm text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Retry"}
                </button>
              </div>
            </div>
          )}
          {!coatingAnalysis && jobCard.notes && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">No coating analysis available</span>
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalysing}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {isAnalysing ? "Analysing..." : "Run Coating Analysis"}
                </button>
              </div>
            </div>
          )}
          {requisition && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Requisition</span>
                </div>
                <Link
                  href={`/stock-control/portal/requisitions/${requisition.id}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100"
                >
                  {requisition.requisitionNumber}
                  <svg
                    className="w-4 h-4 ml-1"
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
                </Link>
              </div>
            </div>
          )}
          {jobCard.customFields && Object.keys(jobCard.customFields).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Custom Fields</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {Object.entries(jobCard.customFields).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {jobCard.lineItems && jobCard.lineItems.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Line Items</h3>
              <span className="text-sm text-gray-500">
                {jobCard.lineItems.filter(isValidLineItem).length} items
              </span>
            </div>
            {attachments.some(
              (a) =>
                a.extractionStatus === "analysed" &&
                ((a.extractedData as { totalExternalM2?: number })?.totalExternalM2 ?? 0) > 0,
            ) && (
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-gray-500">From drawings:</span>
                <span className="font-semibold text-teal-700">
                  Ext:{" "}
                  {attachments
                    .reduce(
                      (sum, a) =>
                        sum +
                        ((a.extractedData as { totalExternalM2?: number })?.totalExternalM2 ?? 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  m²
                </span>
                <span className="font-semibold text-blue-700">
                  Int:{" "}
                  {attachments
                    .reduce(
                      (sum, a) =>
                        sum +
                        ((a.extractedData as { totalInternalM2?: number })?.totalInternalM2 ?? 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  m²
                </span>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item No
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    m²
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JT No
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobCard.lineItems.filter(isValidLineItem).map((li, idx) => (
                  <tr key={li.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-900 break-all">
                      {li.itemCode || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-words">
                      {li.itemDescription || "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 break-all">
                      {li.itemNo || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {li.quantity ?? "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                      {li.m2 ? Number(li.m2).toFixed(2) : "-"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {li.jtNo || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-200">
            {jobCard.lineItems.filter(isValidLineItem).map((li, idx) => (
              <div key={li.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {li.itemCode || "-"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    {li.quantity && (
                      <span className="font-semibold text-gray-900">Qty: {li.quantity}</span>
                    )}
                    {li.m2 && <span className="text-gray-600">{Number(li.m2).toFixed(2)} m²</span>}
                  </div>
                </div>
                {li.itemDescription && (
                  <p className="text-sm text-gray-700 mb-1">{li.itemDescription}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {li.itemNo && <span>Item: {li.itemNo}</span>}
                  {li.jtNo && <span>JT: {li.jtNo}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(() => {
        const notes = (jobCard.notes || "").toLowerCase();
        const isRubberJob =
          notes.includes("rubber") ||
          notes.includes("r/l") ||
          notes.includes("lining") ||
          notes.includes("liner");
        if (!isRubberJob) return null;

        const validItems = jobCard.lineItems?.filter(isValidLineItem) ?? [];
        const hasM2Items = validItems.some((li) => li.m2 !== null && Number(li.m2) > 0);
        return hasM2Items ? <RubberAllocationSection lineItems={validItems} /> : null;
      })()}

      {versions.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="w-full px-4 py-4 sm:px-6 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Version History</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {versions.length} archived
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${showVersionHistory ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showVersionHistory && (
            <div className="px-4 py-4 sm:px-6 space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">
                        v{version.versionNumber}
                      </span>
                      <span className="text-sm text-gray-500">
                        {version.originalFilename || "No file"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateZA(version.createdAt)}
                      {version.createdBy && ` by ${version.createdBy}`}
                    </p>
                    {version.amendmentNotes && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        &quot;{version.amendmentNotes}&quot;
                      </p>
                    )}
                  </div>
                  {version.filePath && (
                    <a
                      href={version.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Drawing Attachments</h3>
          <span className="text-sm text-gray-500">{attachments.length} attachments</span>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div
            onDrop={handleAttachmentDrop}
            onDragOver={handleAttachmentDragOver}
            onDragEnter={handleAttachmentDragOver}
            onDragLeave={handleAttachmentDragLeave}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDraggingAttachment
                ? "border-teal-500 bg-teal-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {attachmentFile ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-900">{attachmentFile.name}</p>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={attachmentNotes}
                  onChange={(e) => setAttachmentNotes(e.target.value)}
                  className="block w-full max-w-xs mx-auto text-sm rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                />
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => {
                      setAttachmentFile(null);
                      setAttachmentNotes("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAttachmentUpload}
                    disabled={isUploadingAttachment}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    {isUploadingAttachment ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
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
                  Drop a PDF drawing here or{" "}
                  <label className="text-teal-600 hover:text-teal-800 cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setAttachmentFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Nix can extract pipe dimensions from PDF drawings
                </p>
              </>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="mt-4 space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {attachment.originalFilename}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${extractionStatusBadge(attachment.extractionStatus)}`}
                      >
                        {attachment.extractionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateZA(attachment.createdAt)}
                      {attachment.uploadedBy && ` by ${attachment.uploadedBy}`}
                    </p>
                    {attachment.extractionStatus === "analysed" && attachment.extractedData && (
                      <div className="mt-2 text-xs text-gray-600">
                        {(attachment.extractedData as { totalExternalM2?: number })
                          .totalExternalM2 !== undefined && (
                          <span className="mr-3">
                            Ext:{" "}
                            {
                              (attachment.extractedData as { totalExternalM2: number })
                                .totalExternalM2
                            }{" "}
                            m²
                          </span>
                        )}
                        {(attachment.extractedData as { totalInternalM2?: number })
                          .totalInternalM2 !== undefined && (
                          <span>
                            Int:{" "}
                            {
                              (attachment.extractedData as { totalInternalM2: number })
                                .totalInternalM2
                            }{" "}
                            m²
                          </span>
                        )}
                      </div>
                    )}
                    {attachment.extractionStatus === "failed" && attachment.extractionError && (
                      <p className="text-xs text-red-600 mt-1">{attachment.extractionError}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {(attachment.extractionStatus === "pending" ||
                      attachment.extractionStatus === "failed") && (
                      <button
                        onClick={() => handleTriggerExtraction(attachment.id)}
                        disabled={isExtracting === attachment.id}
                        className="text-sm text-teal-600 hover:text-teal-800 disabled:text-gray-400"
                      >
                        {isExtracting === attachment.id ? "Extracting..." : "Extract"}
                      </button>
                    )}
                    <a
                      href={attachment.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Stock Allocations</h3>
          <span className="text-sm text-gray-500">{allocations.length} allocations</span>
        </div>
        {allocations.length === 0 ? (
          <div className="text-center py-12">
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No allocations</h3>
            <p className="mt-1 text-sm text-gray-500">Allocate stock items to this job card.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Qty Used
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Staff
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Allocated By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Notes
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr
                  key={allocation.id}
                  className={
                    allocation.pendingApproval
                      ? "bg-amber-50 hover:bg-amber-100"
                      : allocation.rejectedAt
                        ? "bg-red-50 hover:bg-red-100"
                        : "hover:bg-gray-50"
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {allocation.stockItem?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {allocation.stockItem?.sku || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {allocation.quantityUsed}
                    {allocation.allowedLitres && (
                      <span className="text-xs text-gray-400 ml-1">
                        / {allocation.allowedLitres}L allowed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {allocation.staffMember?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {allocation.allocatedBy || "System"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(allocation.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {allocation.notes || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {allocation.pendingApproval ? (
                      <div className="flex flex-col space-y-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                        {(user?.role === "manager" || user?.role === "admin") && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveAllocation(allocation.id)}
                              disabled={approvingAllocationId === allocation.id}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {approvingAllocationId === allocation.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason:");
                                if (reason) {
                                  handleRejectAllocation(allocation.id, reason);
                                }
                              }}
                              disabled={rejectingAllocationId === allocation.id}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {rejectingAllocationId === allocation.id ? "..." : "Reject"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : allocation.rejectedAt ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Rejected
                        </span>
                        {allocation.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">{allocation.rejectionReason}</p>
                        )}
                      </div>
                    ) : allocation.approvedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Allocated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAllocateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAllocateModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allocate Stock to Job</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Item</label>
                  <select
                    value={allocateForm.stockItemId}
                    onChange={(e) =>
                      setAllocateForm({
                        ...allocateForm,
                        stockItemId: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value={0}>Select an item...</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} (SOH: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={allocateForm.quantityUsed}
                    onChange={(e) =>
                      setAllocateForm({
                        ...allocateForm,
                        quantityUsed: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={allocateForm.notes}
                    onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                {activeStaff.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Allocated To (Staff)
                    </label>
                    <select
                      value={allocateForm.staffMemberId}
                      onChange={(e) =>
                        setAllocateForm({
                          ...allocateForm,
                          staffMemberId: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    >
                      <option value={0}>None</option>
                      {activeStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {member.employeeNumber ? ` (${member.employeeNumber})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <PhotoCapture
                    onCapture={(file) => setCapturedFile(file)}
                    currentPhotoUrl={capturedFile ? URL.createObjectURL(capturedFile) : undefined}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocate}
                  disabled={isAllocating || !allocateForm.stockItemId}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAllocating ? "Allocating..." : "Allocate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        existingSignature={null}
        jobNumber={jobCard.jobNumber}
        stepName={currentApprovalStep.replace(/_/g, " ")}
      />

      {showAmendmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowAmendmentModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Amendment</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a new version of this job card. The current version will be archived.
              </p>
              <div className="space-y-4">
                <div
                  onDrop={handleAmendmentDrop}
                  onDragOver={handleAmendmentDragOver}
                  onDragEnter={handleAmendmentDragOver}
                  onDragLeave={handleAmendmentDragLeave}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDraggingAmendment
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {amendmentFile ? (
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-8 w-8 text-teal-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-900">{amendmentFile.name}</p>
                      <button
                        onClick={() => setAmendmentFile(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-8 w-8 text-gray-400"
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
                        Drop a file here or{" "}
                        <label className="text-teal-600 hover:text-teal-800 cursor-pointer">
                          browse
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setAmendmentFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amendment Notes (optional)
                  </label>
                  <textarea
                    value={amendmentNotes}
                    onChange={(e) => setAmendmentNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe what changed in this version..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAmendmentModal(false);
                    setAmendmentFile(null);
                    setAmendmentNotes("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAmendmentUpload}
                  disabled={isUploadingAmendment || !amendmentFile}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isUploadingAmendment ? "Uploading..." : "Upload Amendment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
