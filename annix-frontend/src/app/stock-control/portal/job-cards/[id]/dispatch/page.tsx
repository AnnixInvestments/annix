"use client";

import { Camera, CheckCircle, FileText, ImageIcon, Trash2, Truck, Upload, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CdnLineMatch,
  DispatchCdn,
  DispatchLoadPhoto,
  DispatchProgress,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import { useJobCardDetail } from "@/app/lib/query/hooks";

export default function DispatchPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Number(params.id);

  const { data: jobCard, isLoading: isLoadingJob } = useJobCardDetail(jobId);

  const [progress, setProgress] = useState<DispatchProgress | null>(null);
  const [cdns, setCdns] = useState<DispatchCdn[]>([]);
  const [loadPhotos, setLoadPhotos] = useState<DispatchLoadPhoto[]>([]);
  const [isLoadingDispatch, setIsLoadingDispatch] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingCdn, setIsUploadingCdn] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCdnPreview, setShowCdnPreview] = useState<DispatchCdn | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState<DispatchLoadPhoto | null>(null);
  const cdnInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isLoading = isLoadingJob || isLoadingDispatch;

  const fetchDispatchData = useCallback(async () => {
    try {
      setIsLoadingDispatch(true);
      const [progressData, cdnData, photoData] = await Promise.all([
        stockControlApiClient.dispatchProgress(jobId),
        stockControlApiClient.dispatchCdns(jobId),
        stockControlApiClient.dispatchLoadPhotos(jobId),
      ]);
      setProgress(progressData);
      setCdns(cdnData);
      setLoadPhotos(photoData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dispatch data");
    } finally {
      setIsLoadingDispatch(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDispatchData();
  }, [fetchDispatchData]);

  const handleCdnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCdn(true);
      setError(null);
      await stockControlApiClient.uploadDispatchCdn(jobId, file);
      await fetchDispatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CDN upload failed");
    } finally {
      setIsUploadingCdn(false);
      if (cdnInputRef.current) {
        cdnInputRef.current.value = "";
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingPhotos(true);
      setError(null);
      await stockControlApiClient.uploadDispatchLoadPhotos(jobId, Array.from(files));
      await fetchDispatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setIsUploadingPhotos(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const handleDeleteCdn = async (cdnId: number) => {
    try {
      await stockControlApiClient.deleteDispatchCdn(jobId, cdnId);
      await fetchDispatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete CDN");
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      await stockControlApiClient.deleteDispatchLoadPhoto(jobId, photoId);
      await fetchDispatchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  };

  const handleCompleteDispatch = async () => {
    if (!progress?.canComplete) {
      const missing: string[] = [];
      if (!progress?.hasCdn) {
        missing.push("Customer Delivery Note");
      }
      if (!progress?.hasLoadPhotos) {
        missing.push("load photos");
      }
      setError(`Cannot complete dispatch. Missing: ${missing.join(" and ")}.`);
      return;
    }

    try {
      setIsCompleting(true);
      await stockControlApiClient.completeDispatch(jobId);
      router.push(`/stock-control/portal/job-cards/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete dispatch");
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dispatch data...</p>
        </div>
      </div>
    );
  }

  if (!jobCard || !progress) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error || "Job card not found"}</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/stock-control/portal/job-cards/${jobId}`}
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
              <h1 className="text-2xl font-bold text-gray-900">Dispatch: {jobCard.jobNumber}</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                Ready for Dispatch
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{jobCard.jobName}</p>
          </div>
        </div>
        {progress.canComplete && (
          <button
            onClick={handleCompleteDispatch}
            disabled={isCompleting}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400"
          >
            <Truck className="w-5 h-5 mr-2" />
            {isCompleting ? "Completing..." : "Dispatch Complete"}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <X className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-teal-600" />
            Customer Delivery Note (CDN)
          </h2>
          {progress.hasCdn && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Uploaded
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Upload the Customer Delivery Note (PDF or image). Nix will analyse it against the job card
          line items.
        </p>

        <div className="flex items-center space-x-4">
          <input
            ref={cdnInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleCdnUpload}
            className="hidden"
            id="cdn-upload-page"
          />
          <label
            htmlFor="cdn-upload-page"
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${isUploadingCdn ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploadingCdn ? "Uploading..." : "Upload CDN"}
          </label>
        </div>

        {cdns.length > 0 && (
          <div className="mt-4 space-y-3">
            {cdns.map((cdn) => (
              <div
                key={cdn.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div
                  className="flex items-center space-x-3 flex-1 cursor-pointer"
                  onClick={() => setShowCdnPreview(cdn)}
                >
                  <FileText className="w-8 h-8 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cdn.originalFilename}</p>
                    <p className="text-xs text-gray-500">
                      {cdn.cdnNumber ? `CDN #${cdn.cdnNumber}` : "Analysing..."}
                      {cdn.uploadedByName ? ` | Uploaded by ${cdn.uploadedByName}` : ""}
                      {cdn.createdAt ? ` | ${formatDateLongZA(new Date(cdn.createdAt))}` : ""}
                    </p>
                    {cdn.lineMatches && cdn.lineMatches.length > 0 && (
                      <p className="text-xs text-teal-600 mt-1">
                        {cdn.lineMatches.length} line items matched
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCdn(cdn.id)}
                  className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {cdns.length > 0 && cdns.some((c) => c.lineMatches && c.lineMatches.length > 0) && (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">CDN Line Item Analysis</h3>
            <p className="mt-1 text-sm text-gray-500">
              AI-matched CDN items against job card line items
            </p>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CDN Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  CDN Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Matched JC Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  JC Qty
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cdns.flatMap((cdn) =>
                (cdn.lineMatches || ([] as CdnLineMatch[])).map((match, idx) => (
                  <tr key={`${cdn.id}-${idx}`}>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {match.cdnDescription}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {match.cdnQuantity || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {match.matchedDescription || (
                        <span className="text-orange-500 italic">No match</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {match.matchedQuantity || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          match.confidence >= 0.7
                            ? "bg-green-100 text-green-800"
                            : match.confidence >= 0.4
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {Math.round(match.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-teal-600" />
            Load Photos
          </h2>
          {progress.hasLoadPhotos && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              {loadPhotos.length} photo{loadPhotos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Upload photos of the load on the trucks. These are stored in the job file for records.
        </p>

        <div className="flex items-center space-x-4">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
            id="photo-upload-page"
          />
          <label
            htmlFor="photo-upload-page"
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${isUploadingPhotos ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Camera className="w-4 h-4 mr-2" />
            {isUploadingPhotos ? "Uploading..." : "Upload Photos"}
          </label>
        </div>

        {loadPhotos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loadPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative group rounded-lg overflow-hidden border border-gray-200"
              >
                <div
                  className="aspect-square bg-gray-100 cursor-pointer"
                  onClick={() => setShowPhotoPreview(photo)}
                >
                  {photo.mimeType.startsWith("image/") ? (
                    <img
                      src={photo.filePath}
                      alt={photo.originalFilename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-600 truncate">{photo.originalFilename}</p>
                  <p className="text-xs text-gray-400">{photo.uploadedByName || "Unknown"}</p>
                </div>
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-1 right-1 p-1 bg-white bg-opacity-80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!progress.canComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Truck className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Before dispatch can be completed:
              </p>
              <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                {!progress.hasCdn && <li>Upload a Customer Delivery Note (CDN)</li>}
                {!progress.hasLoadPhotos && <li>Upload photos of the load on the trucks</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showCdnPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowCdnPreview(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {showCdnPreview.originalFilename}
                  {showCdnPreview.cdnNumber ? ` (CDN #${showCdnPreview.cdnNumber})` : ""}
                </h3>
                <button
                  onClick={() => setShowCdnPreview(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {showCdnPreview.mimeType === "application/pdf" ? (
                  <iframe
                    src={showCdnPreview.filePath}
                    className="w-full min-h-[70vh]"
                    title={showCdnPreview.originalFilename}
                  />
                ) : (
                  <img
                    src={showCdnPreview.filePath}
                    alt={showCdnPreview.originalFilename}
                    className="max-w-full mx-auto"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPhotoPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowPhotoPreview(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {showPhotoPreview.originalFilename}
                </h3>
                <button
                  onClick={() => setShowPhotoPreview(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <img
                  src={showPhotoPreview.filePath}
                  alt={showPhotoPreview.originalFilename}
                  className="max-w-full mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
