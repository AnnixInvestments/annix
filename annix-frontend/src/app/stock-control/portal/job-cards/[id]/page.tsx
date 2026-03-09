"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  UnverifiedProduct,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { ApprovalModal } from "@/app/stock-control/components/ApprovalModal";
import { JobCardNextAction } from "@/app/stock-control/components/NextActionBanner";
import { WorkflowStatus } from "@/app/stock-control/components/WorkflowStatus";
import { AllocationsTab } from "./components/AllocationsTab";
import { CoatingAnalysisTab } from "./components/CoatingAnalysisTab";
import { DetailsTab } from "./components/DetailsTab";
import DispatchTab from "./components/DispatchTab";
import {
  JobCardTabs,
  type TabDefinition,
  TabPanel,
  useJobCardTabs,
} from "./components/JobCardTabs";
import { LineItemsTab } from "./components/LineItemsTab";
import { RequisitionTab } from "./components/RequisitionTab";
import { RubberAllocationGuard } from "./components/RubberAllocation";
import { isValidLineItem, STATUS_TRANSITIONS, statusBadgeColor } from "./lib/helpers";

export default function JobCardDetailPage() {
  const params = useParams();
  const authContext = useStockControlAuth();
  const user = authContext.user;
  const profile = authContext.profile;
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
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isExtracting, setIsExtracting] = useState<number | null>(null);
  const [isExtractingAll, setIsExtractingAll] = useState(false);
  const [isDraggingAmendment, setIsDraggingAmendment] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [showTdsModal, setShowTdsModal] = useState(false);
  const [unverifiedProducts, setUnverifiedProducts] = useState<UnverifiedProduct[]>([]);
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [isUploadingTds, setIsUploadingTds] = useState(false);

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
          setRequisition(match || null);
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
    if (newStatus === "active") {
      try {
        const products = await stockControlApiClient.unverifiedCoatingProducts(jobId);
        if (products.length > 0) {
          setUnverifiedProducts(products);
          setShowTdsModal(true);
          return;
        }
      } catch {
        // proceed with activation attempt
      }
    }

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

  const handleTdsUpload = async () => {
    if (!tdsFile) return;
    try {
      setIsUploadingTds(true);
      const updated = await stockControlApiClient.uploadCoatingTds(jobId, tdsFile);
      setCoatingAnalysis(updated);
      setTdsFile(null);
      const remaining = (updated.coats || []).filter((c) => !c.verified);
      if (remaining.length === 0) {
        setShowTdsModal(false);
        setUnverifiedProducts([]);
      } else {
        setUnverifiedProducts(
          remaining.map((c) => ({
            product: c.product,
            genericType: c.genericType,
            estimatedVolumeSolids: c.solidsByVolumePercent,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to process TDS"));
    } finally {
      setIsUploadingTds(false);
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
    if (attachmentFiles.length === 0) return;
    try {
      setIsUploadingAttachment(true);
      await attachmentFiles.reduce(
        (chain, file) =>
          chain.then(() =>
            stockControlApiClient.uploadJobCardAttachment(jobId, file).then(() => undefined),
          ),
        Promise.resolve() as Promise<void>,
      );
      setAttachmentFiles([]);
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

  const handleExtractAll = async () => {
    try {
      setIsExtractingAll(true);
      await stockControlApiClient.extractAllDrawings(jobId);
      const updatedAttachments = await stockControlApiClient.jobCardAttachments(jobId);
      setAttachments(updatedAttachments);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Extraction failed"));
    } finally {
      setIsExtractingAll(false);
    }
  };

  const handleAttachmentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validExtensions = [".pdf", ".dxf"];
      const newFiles = Array.from(files).filter((f) =>
        validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
      );
      setAttachmentFiles((prev) => [...prev, ...newFiles]);
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

  const currentStatus = workflowStatus?.currentStatus || null;
  const canApprove = workflowStatus?.canApprove || false;
  const currentStep = workflowStatus?.currentStep || null;
  const userRole = user?.role || null;
  const pipingLossPct = profile?.pipingLossFactorPct || 45;

  const validLineItemCount = useMemo(
    () => (jobCard?.lineItems ? jobCard.lineItems.filter(isValidLineItem).length : 0),
    [jobCard],
  );

  const tabDefinitions: TabDefinition[] = useMemo(() => {
    const status = jobCard?.status?.toLowerCase() || "draft";
    return [
      { id: "details", label: "Details" },
      {
        id: "line-items",
        label: "Line Items",
        badge: validLineItemCount > 0 ? validLineItemCount : null,
        hidden: !jobCard?.lineItems || jobCard.lineItems.length === 0,
      },
      { id: "coating", label: "Coating Analysis" },
      { id: "requisition", label: "Requisition" },
      {
        id: "allocations",
        label: "Allocations",
        badge: allocations.length > 0 ? allocations.length : null,
      },
      {
        id: "dispatch",
        label: "Dispatch",
        hidden: status === "draft" && currentStatus !== "ready_for_dispatch",
      },
    ];
  }, [jobCard, validLineItemCount, allocations.length, currentStatus]);

  const { activeTab, visitedTabs, handleTabChange, visibleTabs } = useJobCardTabs(tabDefinitions);

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
              {jobCard.cpoId ? (
                <Link
                  href={`/stock-control/portal/purchase-orders/${jobCard.cpoId}`}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  CPO Linked
                </Link>
              ) : null}
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
            {isDownloadingQr ? "Generating..." : "Print JC"}
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
          {canApprove && currentStep && (
            <button
              onClick={() => openApprovalModal(currentStep)}
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
          {currentStatus === "ready_for_dispatch" && (
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

      {workflowStatus && currentStatus !== "draft" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WorkflowStatus currentStatus={currentStatus!} approvals={approvals} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Actions</h3>
            {canApprove && currentStep ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  This job card is awaiting your approval at the{" "}
                  <span className="font-medium">{currentStep.replace(/_/g, " ")}</span> step.
                </p>
                <button
                  onClick={() => openApprovalModal(currentStep)}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                >
                  Review &amp; Approve
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {currentStatus === "dispatched" ? (
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

      <JobCardNextAction
        currentStatus={currentStatus}
        canApprove={canApprove}
        currentStep={currentStep}
        userRole={userRole}
        onApprove={currentStep ? () => openApprovalModal(currentStep) : undefined}
        jobCardId={jobId}
      />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <JobCardTabs tabs={tabDefinitions} activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="px-4 sm:px-6">
          <TabPanel tabId="details" activeTab={activeTab} visited={visitedTabs.has("details")}>
            <DetailsTab
              jobCard={jobCard}
              versions={versions}
              attachments={attachments}
              showVersionHistory={showVersionHistory}
              onToggleVersionHistory={() => setShowVersionHistory(!showVersionHistory)}
              showAmendmentModal={showAmendmentModal}
              onToggleAmendmentModal={setShowAmendmentModal}
              amendmentNotes={amendmentNotes}
              onAmendmentNotesChange={setAmendmentNotes}
              amendmentFile={amendmentFile}
              onAmendmentFileChange={setAmendmentFile}
              isUploadingAmendment={isUploadingAmendment}
              onAmendmentUpload={handleAmendmentUpload}
              isDraggingAmendment={isDraggingAmendment}
              onAmendmentDrop={handleAmendmentDrop}
              onAmendmentDragOver={handleAmendmentDragOver}
              onAmendmentDragLeave={handleAmendmentDragLeave}
              attachmentFiles={attachmentFiles}
              onAttachmentFilesChange={setAttachmentFiles}
              isUploadingAttachment={isUploadingAttachment}
              onAttachmentUpload={handleAttachmentUpload}
              isDraggingAttachment={isDraggingAttachment}
              onAttachmentDrop={handleAttachmentDrop}
              onAttachmentDragOver={handleAttachmentDragOver}
              onAttachmentDragLeave={handleAttachmentDragLeave}
              onTriggerExtraction={handleTriggerExtraction}
              isExtracting={isExtracting}
              isExtractingAll={isExtractingAll}
              onExtractAll={handleExtractAll}
              onDeleteAttachment={handleDeleteAttachment}
            />
          </TabPanel>

          <TabPanel
            tabId="line-items"
            activeTab={activeTab}
            visited={visitedTabs.has("line-items")}
          >
            <LineItemsTab jobCard={jobCard} attachments={attachments} />
          </TabPanel>

          <TabPanel tabId="coating" activeTab={activeTab} visited={visitedTabs.has("coating")}>
            <CoatingAnalysisTab
              jobId={jobId}
              coatingAnalysis={coatingAnalysis}
              isAnalysing={isAnalysing}
              onRunAnalysis={handleRunAnalysis}
              onCoatingAnalysisChange={setCoatingAnalysis}
              pipingLossPct={pipingLossPct}
              showTdsModal={showTdsModal}
              onShowTdsModal={setShowTdsModal}
              unverifiedProducts={unverifiedProducts}
              onUnverifiedProductsChange={setUnverifiedProducts}
              tdsFile={tdsFile}
              onTdsFileChange={setTdsFile}
              isUploadingTds={isUploadingTds}
              onTdsUpload={handleTdsUpload}
            />
          </TabPanel>

          <TabPanel
            tabId="requisition"
            activeTab={activeTab}
            visited={visitedTabs.has("requisition")}
          >
            <RequisitionTab requisition={requisition} jobId={jobId} />
          </TabPanel>

          <TabPanel
            tabId="allocations"
            activeTab={activeTab}
            visited={visitedTabs.has("allocations")}
          >
            <div className="space-y-6">
              <RubberAllocationGuard jobCard={jobCard} />
              <AllocationsTab
                jobCard={jobCard}
                jobId={jobId}
                allocations={allocations}
                userRole={userRole}
                onAllocate={openAllocateModal}
                showAllocateModal={showAllocateModal}
                onCloseAllocateModal={() => setShowAllocateModal(false)}
                allocateForm={allocateForm}
                onAllocateFormChange={setAllocateForm}
                isAllocating={isAllocating}
                onSubmitAllocate={handleAllocate}
                stockItems={stockItems}
                activeStaff={activeStaff}
                capturedFile={capturedFile}
                onCapturedFileChange={setCapturedFile}
                approvingAllocationId={approvingAllocationId}
                rejectingAllocationId={rejectingAllocationId}
                onApproveAllocation={handleApproveAllocation}
                onRejectAllocation={handleRejectAllocation}
              />
            </div>
          </TabPanel>

          <TabPanel tabId="dispatch" activeTab={activeTab} visited={visitedTabs.has("dispatch")}>
            <DispatchTab
              jobId={jobId}
              jobNumber={jobCard.jobNumber}
              jobName={jobCard.jobName}
              onRefreshParent={fetchData}
            />
          </TabPanel>
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        existingSignature={null}
        jobNumber={jobCard.jobNumber}
        stepName={currentApprovalStep.replace(/_/g, " ")}
      />
    </div>
  );
}
