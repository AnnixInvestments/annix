import { useCallback, useState } from "react";
import type { CoatingAnalysis, UnverifiedProduct } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

export function useJobCardCoating(jobId: number) {
  const [coatingAnalysis, setCoatingAnalysis] = useState<CoatingAnalysis | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [showTdsModal, setShowTdsModal] = useState(false);
  const [unverifiedProducts, setUnverifiedProducts] = useState<UnverifiedProduct[]>([]);
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [isUploadingTds, setIsUploadingTds] = useState(false);

  const loadCoatingAnalysis = useCallback(async () => {
    stockControlApiClient
      .jobCardCoatingAnalysis(jobId)
      .then((data) => setCoatingAnalysis(data))
      .catch(() => setCoatingAnalysis(null));
  }, [jobId]);

  const handleRunAnalysis = useCallback(async () => {
    try {
      setIsAnalysing(true);
      const result = await stockControlApiClient.triggerCoatingAnalysis(jobId);
      setCoatingAnalysis(result && "id" in result ? result : null);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Coating analysis failed");
    } finally {
      setIsAnalysing(false);
    }
  }, [jobId]);

  const handleTdsUpload = useCallback(async () => {
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
      throw err instanceof Error ? err : new Error("Failed to process TDS");
    } finally {
      setIsUploadingTds(false);
    }
  }, [jobId, tdsFile]);

  const checkUnverifiedProducts = useCallback(async (): Promise<boolean> => {
    try {
      const products = await stockControlApiClient.unverifiedCoatingProducts(jobId);
      if (products.length > 0) {
        setUnverifiedProducts(products);
        setShowTdsModal(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [jobId]);

  return {
    coatingAnalysis,
    setCoatingAnalysis,
    isAnalysing,
    showTdsModal,
    setShowTdsModal,
    unverifiedProducts,
    setUnverifiedProducts,
    tdsFile,
    setTdsFile,
    isUploadingTds,
    loadCoatingAnalysis,
    handleRunAnalysis,
    handleTdsUpload,
    checkUnverifiedProducts,
  };
}
