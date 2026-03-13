"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  JobCard,
  JobCardApproval,
  Requisition,
  StaffMember,
  StockAllocation,
  StockItem,
  WorkflowStatus as WorkflowStatusData,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { ApprovalModal } from "@/app/stock-control/components/ApprovalModal";
import { JobCardNextAction } from "@/app/stock-control/components/NextActionBanner";
import { WorkflowStatus } from "@/app/stock-control/components/WorkflowStatus";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";
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
import { QualityTab } from "./components/QualityTab";
import { RequisitionTab } from "./components/RequisitionTab";
import { RubberAllocationGuard } from "./components/RubberAllocation";
import { useJobCardCoating } from "./hooks/useJobCardCoating";
import { useJobCardDocuments } from "./hooks/useJobCardDocuments";
import { isValidLineItem, STATUS_TRANSITIONS, statusBadgeColor } from "./lib/helpers";

export default function JobCardDetailPage() {
  const params = useParams();
  const authContext = useStockControlAuth();
  const user = authContext.user;
  const profile = authContext.profile;
  const { confirm, ConfirmDialog } = useConfirm();
  const jobId = Number(params.id);

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusData | null>(null);
  const [approvals, setApprovals] = useState<JobCardApproval[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentApprovalStep, setCurrentApprovalStep] = useState("");
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
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
  const [approvingAllocationId, setApprovingAllocationId] = useState<number | null>(null);
  const [rejectingAllocationId, setRejectingAllocationId] = useState<number | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [deliveryJobCards, setDeliveryJobCards] = useState<JobCard[]>([]);

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
        .requisitions()
        .then((reqs) => {
          const match = reqs.find((r) => r.jobCardId === jobId && r.status !== "cancelled");
          setRequisition(match || null);
        })
        .catch(() => setRequisition(null));

      stockControlApiClient
        .deliveryJobCards(jobId)
        .then((data) => setDeliveryJobCards(data))
        .catch(() => setDeliveryJobCards([]));

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

  const documents = useJobCardDocuments(jobId, fetchData, confirm);
  const coating = useJobCardCoating(jobId);

  useEffect(() => {
    fetchData();
    documents.loadDocuments();
    coating.loadCoatingAnalysis();
  }, [fetchData, documents.loadDocuments, coating.loadCoatingAnalysis]);

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

  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handlePrintQr = async () => {
    try {
      setIsDownloadingQr(true);
      setDownloadError(null);
      await stockControlApiClient.downloadJobCardQrPdf(jobId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download job card PDF");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "active") {
      const hasUnverified = await coating.checkUnverifiedProducts();
      if (hasUnverified) return;
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
      setDownloadError(null);
      await stockControlApiClient.downloadSignedJobCardPdf(jobId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download signed PDF");
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
      {
        id: "details",
        label: "Details",
        badge: validLineItemCount > 0 ? validLineItemCount : null,
      },
      { id: "coating", label: "Coating Analysis" },
      {
        id: "rubber-analysis",
        label: "Rubber Analysis",
        badge: allocations.length > 0 ? allocations.length : null,
      },
      { id: "quality", label: "Quality", hidden: !profile?.qcEnabled },
      {
        id: "dispatch",
        label: "Dispatch",
        hidden: status === "draft" && currentStatus !== "ready_for_dispatch",
      },
      { id: "requisition", label: "Requisition" },
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
      {ConfirmDialog}
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
              {jobCard.jtDnNumber ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                  {jobCard.jtDnNumber}
                </span>
              ) : null}
              {jobCard.parentJobCardId ? (
                <Link
                  href={`/stock-control/portal/job-cards/${jobCard.parentJobCardId}`}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200"
                >
                  Parent JC
                </Link>
              ) : null}
              {jobCard.cpoId ? (
                <Link
                  href={`/stock-control/portal/purchase-orders/${jobCard.cpoId}`}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  CPO Linked
                </Link>
              ) : null}
              {jobCard.workflowCeiling ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                  Up to Requisition
                </span>
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

      {downloadError && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-md px-4 py-3">
          <p className="text-sm text-red-700">{downloadError}</p>
          <button
            onClick={() => setDownloadError(null)}
            className="text-red-500 hover:text-red-700 ml-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

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

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <JobCardTabs tabs={tabDefinitions} activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="px-4 sm:px-6">
          <TabPanel tabId="details" activeTab={activeTab} visited={visitedTabs.has("details")}>
            <DetailsTab
              jobCard={jobCard}
              versions={documents.versions}
              attachments={documents.attachments}
              lineItemsContent={
                <LineItemsTab jobCard={jobCard} attachments={documents.attachments} />
              }
              showVersionHistory={documents.showVersionHistory}
              onToggleVersionHistory={() =>
                documents.setShowVersionHistory(!documents.showVersionHistory)
              }
              showAmendmentModal={documents.showAmendmentModal}
              onToggleAmendmentModal={documents.setShowAmendmentModal}
              amendmentNotes={documents.amendmentNotes}
              onAmendmentNotesChange={documents.setAmendmentNotes}
              amendmentFile={documents.amendmentFile}
              onAmendmentFileChange={documents.setAmendmentFile}
              isUploadingAmendment={documents.isUploadingAmendment}
              onAmendmentUpload={documents.handleAmendmentUpload}
              isDraggingAmendment={documents.isDraggingAmendment}
              onAmendmentDrop={documents.handleAmendmentDrop}
              onAmendmentDragOver={documents.handleAmendmentDragOver}
              onAmendmentDragLeave={documents.handleAmendmentDragLeave}
              attachmentFiles={documents.attachmentFiles}
              onAttachmentFilesChange={documents.setAttachmentFiles}
              isUploadingAttachment={documents.isUploadingAttachment}
              onAttachmentUpload={documents.handleAttachmentUpload}
              isDraggingAttachment={documents.isDraggingAttachment}
              onAttachmentDrop={documents.handleAttachmentDrop}
              onAttachmentDragOver={documents.handleAttachmentDragOver}
              onAttachmentDragLeave={documents.handleAttachmentDragLeave}
              onTriggerExtraction={documents.handleTriggerExtraction}
              isExtracting={documents.isExtracting}
              isExtractingAll={documents.isExtractingAll}
              onExtractAll={documents.handleExtractAll}
              onDeleteAttachment={documents.handleDeleteAttachment}
            />

            {documents.versions.length > 0 && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Version History</h3>
                <select
                  value={documents.selectedVersionId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    documents.setSelectedVersionId(val ? Number(val) : null);
                  }}
                  className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Current (v{jobCard.versionNumber})</option>
                  {documents.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} - {v.jobName}
                      {v.amendmentNotes ? ` (${v.amendmentNotes})` : ""}
                    </option>
                  ))}
                </select>

                {documents.selectedVersionId &&
                  (() => {
                    const selectedVersion = documents.versions.find(
                      (v) => v.id === documents.selectedVersionId,
                    );
                    if (!selectedVersion) return null;
                    return (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            Version {selectedVersion.versionNumber}
                          </h4>
                          {selectedVersion.filePath && (
                            <a
                              href={selectedVersion.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-teal-600 hover:text-teal-800 underline"
                            >
                              Download PDF
                            </a>
                          )}
                        </div>
                        {selectedVersion.workflowStatus && (
                          <p className="text-sm text-gray-600">
                            Workflow status: {selectedVersion.workflowStatus}
                          </p>
                        )}
                        {selectedVersion.amendmentNotes && (
                          <p className="text-sm text-gray-600">
                            Notes: {selectedVersion.amendmentNotes}
                          </p>
                        )}
                        {selectedVersion.createdBy && (
                          <p className="text-sm text-gray-500">
                            Archived by: {selectedVersion.createdBy} on{" "}
                            {new Date(selectedVersion.createdAt).toLocaleDateString("en-ZA")}
                          </p>
                        )}
                        {selectedVersion.lineItemsSnapshot &&
                          selectedVersion.lineItemsSnapshot.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                                Line Items
                              </h5>
                              <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                      Code
                                    </th>
                                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                      Description
                                    </th>
                                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">
                                      Qty
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {selectedVersion.lineItemsSnapshot.map((li, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {String(li.itemCode || "-")}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {String(li.itemDescription || "-")}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-700">
                                        {String(li.quantity ?? "-")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    );
                  })()}
              </div>
            )}

            {deliveryJobCards.length > 0 && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Delivery Job Cards ({deliveryJobCards.length})
                </h3>
                <div className="space-y-2">
                  {deliveryJobCards.map((djc) => (
                    <Link
                      key={djc.id}
                      href={`/stock-control/portal/job-cards/${djc.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {djc.jobNumber} / {djc.jtDnNumber || djc.jcNumber}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">{djc.jobName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(djc.status)}`}
                        >
                          {djc.status}
                        </span>
                        <span className="text-xs text-gray-400">{djc.workflowStatus}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </TabPanel>

          <TabPanel tabId="coating" activeTab={activeTab} visited={visitedTabs.has("coating")}>
            <CoatingAnalysisTab
              jobId={jobId}
              coatingAnalysis={coating.coatingAnalysis}
              isAnalysing={coating.isAnalysing}
              onRunAnalysis={coating.handleRunAnalysis}
              onCoatingAnalysisChange={coating.setCoatingAnalysis}
              pipingLossPct={pipingLossPct}
              showTdsModal={coating.showTdsModal}
              onShowTdsModal={coating.setShowTdsModal}
              unverifiedProducts={coating.unverifiedProducts}
              onUnverifiedProductsChange={coating.setUnverifiedProducts}
              tdsFile={coating.tdsFile}
              onTdsFileChange={coating.setTdsFile}
              isUploadingTds={coating.isUploadingTds}
              onTdsUpload={coating.handleTdsUpload}
            />
          </TabPanel>

          <TabPanel
            tabId="rubber-analysis"
            activeTab={activeTab}
            visited={visitedTabs.has("rubber-analysis")}
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

          <TabPanel tabId="quality" activeTab={activeTab} visited={visitedTabs.has("quality")}>
            <QualityTab jobCardId={jobId} />
          </TabPanel>

          <TabPanel tabId="dispatch" activeTab={activeTab} visited={visitedTabs.has("dispatch")}>
            <DispatchTab
              jobId={jobId}
              jobNumber={jobCard.jobNumber}
              jobName={jobCard.jobName}
              onRefreshParent={fetchData}
            />
          </TabPanel>

          <TabPanel
            tabId="requisition"
            activeTab={activeTab}
            visited={visitedTabs.has("requisition")}
          >
            <RequisitionTab requisition={requisition} jobId={jobId} />
          </TabPanel>
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        jobNumber={jobCard.jobNumber}
        stepName={currentApprovalStep.replace(/_/g, " ")}
      />
    </div>
  );
}
