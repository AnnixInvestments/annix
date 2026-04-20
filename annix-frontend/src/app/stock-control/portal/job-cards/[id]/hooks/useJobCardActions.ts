import { isArray } from "es-toolkit/compat";
import { useState } from "react";
import { usePdfPreview } from "@/app/components/PdfPreviewModal";
import type { StaffMember, StockItem } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import {
  useAllocateStock,
  useApproveOverAllocation,
  useApproveWorkflowStep,
  useCompleteAction,
  useCompleteBackgroundStepWithOutcome,
  useConfirmIssuance,
  useDownloadJobCardQrPdf,
  useDownloadSignedJobCardPdf,
  useInvalidateJobCards,
  useLoadJobCardPdfPreview,
  usePlaceRequisitionDecision,
  useReExtractJobCardNotes,
  useRejectOverAllocation,
  useRejectWorkflowStep,
  useSaveJobCardCorrection,
  useUpdateJobCard,
  useUseCurrentStockDecision,
} from "@/app/lib/query/hooks";
import type { ConfirmOptions } from "@/app/stock-control/hooks/useConfirm";

interface UseJobCardActionsParams {
  jobId: number;
  currentStep: string | null;
  fetchData: () => void;
  onTabChange: (tabId: string) => void;
  coating: {
    checkUnverifiedProducts: (onAllVerified: () => Promise<void>) => Promise<boolean>;
    setShowTdsModal: (v: boolean) => void;
    setUnverifiedProducts: (v: never[]) => void;
  };
}

export function useJobCardActions(params: UseJobCardActionsParams) {
  const { jobId, currentStep, fetchData, onTabChange, coating } = params;

  const invalidateJobCardsList = useInvalidateJobCards();
  const { mutateAsync: allocateStockMutation } = useAllocateStock();
  const { mutateAsync: approveOverAllocation } = useApproveOverAllocation();
  const { mutateAsync: rejectOverAllocation } = useRejectOverAllocation();
  const { mutateAsync: loadJobCardPdfPreview } = useLoadJobCardPdfPreview();
  const { mutateAsync: downloadJobCardQrPdf } = useDownloadJobCardQrPdf();
  const { mutateAsync: downloadSignedJobCardPdf } = useDownloadSignedJobCardPdf();
  const { mutateAsync: updateJobCard } = useUpdateJobCard();
  const { mutateAsync: approveWorkflowStep } = useApproveWorkflowStep();
  const { mutateAsync: rejectWorkflowStep } = useRejectWorkflowStep();
  const { mutateAsync: completeBackgroundStepWithOutcome } = useCompleteBackgroundStepWithOutcome();
  const { mutateAsync: completeAction } = useCompleteAction();
  const { mutateAsync: reExtractJobCardNotes } = useReExtractJobCardNotes();
  const { mutateAsync: saveJobCardCorrection } = useSaveJobCardCorrection();
  const { mutateAsync: confirmIssuanceMutation } = useConfirmIssuance();
  const { mutateAsync: placeRequisitionDecision } = usePlaceRequisitionDecision();
  const { mutateAsync: submitUseCurrentStockDecision } = useUseCurrentStockDecision();

  const pdfPreview = usePdfPreview();

  const [error, setError] = useState<Error | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [approvingAllocationId, setApprovingAllocationId] = useState<number | null>(null);
  const [rejectingAllocationId, setRejectingAllocationId] = useState<number | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    stockItemId: 0,
    quantityUsed: 1,
    notes: "",
    staffMemberId: 0,
  });
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([]);
  const [bgStepError, setBgStepError] = useState<string | null>(null);
  const [completingStepKey, setCompletingStepKey] = useState<string | null>(null);
  const [isCompletingFgAction, setIsCompletingFgAction] = useState(false);
  const [isReExtractingNotes, setIsReExtractingNotes] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentApprovalStep, setCurrentApprovalStep] = useState("");
  const [isConfirmingIssuance, setIsConfirmingIssuance] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [batchesSavedLocal, setBatchesSaved] = useState(false);
  const [finalPhotosSaved, setFinalPhotosSaved] = useState(false);

  const fetchStockItems = async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stock items"));
    }
  };

  const openAllocateModal = async () => {
    await fetchStockItems();
    try {
      const staff = await stockControlApiClient.staffMembers({ active: "true" });
      setActiveStaff(isArray(staff) ? staff : []);
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
      await allocateStockMutation({
        jobId,
        data: {
          stockItemId: allocateForm.stockItemId,
          quantityUsed: allocateForm.quantityUsed,
          notes: allocateForm.notes ? allocateForm.notes : undefined,
          staffMemberId: allocateForm.staffMemberId ? allocateForm.staffMemberId : undefined,
        },
        photoFile: capturedFile ? capturedFile : undefined,
      });
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
      await approveOverAllocation({ jobId, allocationId });
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
      await rejectOverAllocation({ jobId, allocationId, reason });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reject allocation"));
    } finally {
      setRejectingAllocationId(null);
    }
  };

  const handlePrintQr = async () => {
    try {
      setIsDownloadingQr(true);
      setDownloadError(null);
      const blobUrl = await loadJobCardPdfPreview(jobId);
      setPdfPreviewUrl(blobUrl);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to generate job card PDF");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsDownloadingQr(true);
      await downloadJobCardQrPdf(jobId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download job card PDF");
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const activateJobCard = async (skipTdsCheck?: boolean) => {
    try {
      setIsUpdatingStatus(true);
      await updateJobCard({
        jobCardId: jobId,
        data: {
          status: "active",
          ...(skipTdsCheck ? { skipTdsCheck: true } : {}),
        },
      });
      invalidateJobCardsList();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to activate job card"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "active") {
      const activateWithStatus = async () => {
        try {
          setIsUpdatingStatus(true);
          await updateJobCard({ jobCardId: jobId, data: { status: "active" } });
          invalidateJobCardsList();
          fetchData();
        } catch (err) {
          setError(err instanceof Error ? err : new Error("Failed to update status"));
        } finally {
          setIsUpdatingStatus(false);
        }
      };
      const hasUnverified = await coating.checkUnverifiedProducts(activateWithStatus);
      if (hasUnverified) return;
      await activateWithStatus();
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await updateJobCard({ jobCardId: jobId, data: { status: newStatus } });
      invalidateJobCardsList();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDraftAccepted = async () => {
    const hasUnverified = await coating.checkUnverifiedProducts(() => activateJobCard());
    if (hasUnverified) {
      onTabChange("coating");
      return;
    }
    await activateJobCard();
  };

  const handleSkipTdsAndActivate = async () => {
    coating.setShowTdsModal(false);
    coating.setUnverifiedProducts([]);
    await activateJobCard(true);
  };

  const handleApprove = async (
    signatureDataUrl?: string,
    comments?: string,
    outcomeKey?: string,
  ) => {
    await approveWorkflowStep({
      jobId,
      signatureDataUrl,
      comments,
      outcomeKey,
    });
    invalidateJobCardsList();
    fetchData();
  };

  const handleReject = async (reason: string) => {
    await rejectWorkflowStep({ jobId, reason });
    invalidateJobCardsList();
    fetchData();
  };

  const handleCompleteBackgroundStep = async (stepKey: string, outcomeKey?: string) => {
    try {
      setCompletingStepKey(stepKey);
      setBgStepError(null);
      await completeBackgroundStepWithOutcome({ jobCardId: jobId, stepKey, outcomeKey });
      fetchData();
    } catch (err) {
      setBgStepError(err instanceof Error ? err.message : "Failed to complete background step");
    } finally {
      setCompletingStepKey(null);
    }
  };

  const handleCompleteFgAction = async () => {
    if (!currentStep) return;
    try {
      setIsCompletingFgAction(true);
      await completeAction({ jobCardId: jobId, stepKey: currentStep, actionType: "primary" });
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to complete action";
      setError(new Error(msg));
    } finally {
      setIsCompletingFgAction(false);
    }
  };

  const handleSaveNotes = async (editedNotes: string, jobCardNotes: string | null) => {
    const originalNotes = jobCardNotes ? jobCardNotes : null;
    await updateJobCard({ jobCardId: jobId, data: { notes: editedNotes } });
    const fallbackOriginal = originalNotes ? originalNotes : "";
    if (editedNotes !== fallbackOriginal) {
      await saveJobCardCorrection({
        jobCardId: jobId,
        data: {
          fieldName: "notes",
          originalValue: originalNotes,
          correctedValue: editedNotes,
        },
      }).catch(() => null);
    }
    fetchData();
  };

  const handleReExtractNotes = async () => {
    try {
      setIsReExtractingNotes(true);
      await reExtractJobCardNotes(jobId);
      await stockControlApiClient.recalculateM2(jobId);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to re-extract notes"));
    } finally {
      setIsReExtractingNotes(false);
    }
  };

  const openApprovalModal = (stepName: string) => {
    setCurrentApprovalStep(stepName);
    setShowApprovalModal(true);
  };

  const handlePrintSignedPdf = () => {
    setDownloadError(null);
    pdfPreview.openWithFetch(() => downloadSignedJobCardPdf(jobId), `job-card-signed-${jobId}.pdf`);
  };

  const handleConfirmIssuance = async (
    unissuedIds: number[],
    confirmFn: (opts: ConfirmOptions) => Promise<boolean>,
  ) => {
    if (unissuedIds.length === 0) return;
    const confirmed = await confirmFn({
      title: "Confirm Issuance",
      message: `Issue ${unissuedIds.length} allocated item(s)? This confirms physical handover.`,
      confirmLabel: "Issue",
      variant: "default",
    });
    if (!confirmed) return;
    try {
      setIsConfirmingIssuance(true);
      await confirmIssuanceMutation({
        jobCardId: jobId,
        allocationIds: unissuedIds,
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to confirm issuance"));
    } finally {
      setIsConfirmingIssuance(false);
    }
  };

  const handlePlaceRequisition = async (router: { push: (url: string) => void }) => {
    try {
      setIsProcessingDecision(true);
      setDecisionError(null);
      const result = await placeRequisitionDecision(jobId);
      fetchData();
      if (result.requisitionId) {
        router.push(
          `/stock-control/portal/requisitions/${result.requisitionId}?fromJobCard=${jobId}`,
        );
      } else {
        onTabChange("requisition");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place requisition";
      setDecisionError(message);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const handleUseCurrentStock = async () => {
    try {
      setIsProcessingDecision(true);
      setDecisionError(null);
      await submitUseCurrentStockDecision(jobId);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to use current stock";
      setDecisionError(message);
    } finally {
      setIsProcessingDecision(false);
    }
  };

  return {
    error,
    setError,
    isUpdatingStatus,
    isDownloadingQr,
    downloadError,
    setDownloadError,
    pdfPreviewUrl,
    setPdfPreviewUrl,
    pdfPreview,
    isAllocating,
    showAllocateModal,
    setShowAllocateModal,
    allocateForm,
    setAllocateForm,
    capturedFile,
    setCapturedFile,
    stockItems,
    activeStaff,
    approvingAllocationId,
    rejectingAllocationId,
    bgStepError,
    setBgStepError,
    completingStepKey,
    isCompletingFgAction,
    isReExtractingNotes,
    showApprovalModal,
    setShowApprovalModal,
    currentApprovalStep,
    isConfirmingIssuance,
    isProcessingDecision,
    decisionError,
    batchesSavedLocal,
    setBatchesSaved,
    finalPhotosSaved,
    setFinalPhotosSaved,
    openAllocateModal,
    handleAllocate,
    handleApproveAllocation,
    handleRejectAllocation,
    handlePrintQr,
    handleExportPdf,
    handleStatusUpdate,
    handleDraftAccepted,
    handleSkipTdsAndActivate,
    handleApprove,
    handleReject,
    handleCompleteBackgroundStep,
    handleCompleteFgAction,
    handleSaveNotes,
    handleReExtractNotes,
    openApprovalModal,
    handlePrintSignedPdf,
    handleConfirmIssuance,
    handlePlaceRequisition,
    handleUseCurrentStock,
  };
}
