import { useCallback, useRef, useState } from "react";
import type { CoatingAnalysis, UnverifiedProduct } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

export function useJobCardCoating(jobId: number) {
  const [coatingAnalysis, setCoatingAnalysis] = useState<CoatingAnalysis | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [showTdsModal, setShowTdsModal] = useState(false);
  const [unverifiedProducts, setUnverifiedProducts] = useState<UnverifiedProduct[]>([]);
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [isUploadingTds, setIsUploadingTds] = useState(false);
  const [tdsUploadError, setTdsUploadError] = useState<string | null>(null);
  const onAllVerifiedRef = useRef<(() => Promise<void>) | null>(null);

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
      setTdsUploadError(null);
      const updated = await stockControlApiClient.uploadCoatingTds(jobId, tdsFile);
      setCoatingAnalysis(updated);
      setTdsFile(null);
      const coats = updated.coats;
      const remaining = (coats || []).filter((c) => !c.verified);
      if (remaining.length === 0) {
        setShowTdsModal(false);
        setUnverifiedProducts([]);
        if (onAllVerifiedRef.current) {
          const callback = onAllVerifiedRef.current;
          onAllVerifiedRef.current = null;
          await callback();
        }
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
      setTdsUploadError(err instanceof Error ? err.message : "Failed to process TDS");
    } finally {
      setIsUploadingTds(false);
    }
  }, [jobId, tdsFile]);

  const checkUnverifiedProducts = useCallback(
    async (onAllVerified?: () => Promise<void>): Promise<boolean> => {
      try {
        const products = await stockControlApiClient.unverifiedCoatingProducts(jobId);
        if (products.length > 0) {
          setUnverifiedProducts(products);
          setTdsUploadError(null);
          onAllVerifiedRef.current = onAllVerified || null;
          setShowTdsModal(true);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [jobId],
  );

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
    tdsUploadError,
    loadCoatingAnalysis,
    handleRunAnalysis,
    handleTdsUpload,
    checkUnverifiedProducts,
  };
}
