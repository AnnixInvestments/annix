"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BackgroundStepStatus } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface QaFinalPhotosSectionProps {
  jobCardId: number;
  backgroundSteps: BackgroundStepStatus[];
  onPhotosSaved: () => void;
}

interface SavedPhoto {
  id: number;
  url: string;
  originalFilename: string;
}

export function QaFinalPhotosSection(props: QaFinalPhotosSectionProps) {
  const { jobCardId, backgroundSteps, onPhotosSaved } = props;

  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([]);
  const [noPhotos, setNoPhotos] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const qaFinalStep = backgroundSteps.find((bg) => bg.stepKey === "qa_final_check");
  const stepIsPending = qaFinalStep ? qaFinalStep.completedAt === null : false;

  const loadPhotos = useCallback(async () => {
    try {
      const files = await stockControlApiClient.jobCardJobFiles(jobCardId);
      const imageFiles = (files || []).filter(
        (f) => f.mimeType.startsWith("image/") && f.fileType === "final_photo",
      );
      const photosWithUrls = await Promise.all(
        imageFiles.map(async (f) => {
          const viewUrlRes = await stockControlApiClient.jobCardJobFileViewUrl(jobCardId, f.id);
          return { id: f.id, url: viewUrlRes.url, originalFilename: f.originalFilename };
        }),
      );
      setSavedPhotos(photosWithUrls);
      if (photosWithUrls.length > 0) {
        setIsSaved(true);
      }
    } catch {
      setSavedPhotos([]);
    }
  }, [jobCardId]);

  useEffect(() => {
    if (stepIsPending) {
      loadPhotos();
    }
  }, [stepIsPending, loadPhotos]);

  if (!stepIsPending) {
    return null;
  }

  const handlePhotoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      const result = await stockControlApiClient.uploadReadyPhoto(jobCardId, file);
      const viewUrlRes = await stockControlApiClient.jobCardJobFileViewUrl(jobCardId, result.id);
      setSavedPhotos((prev) => [
        ...prev,
        { id: result.id, url: viewUrlRes.url, originalFilename: result.originalFilename },
      ]);
      setNoPhotos(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      setError(null);
      await stockControlApiClient.deleteJobCardJobFile(jobCardId, photoId);
      setSavedPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
      e.target.value = "";
    }
  };

  const canSave = noPhotos || savedPhotos.length > 0;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setIsSaved(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onPhotosSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="qa-final-photos-section"
      className="rounded-lg border border-teal-200 bg-white shadow-sm"
    >
      <div className="border-b border-teal-200 bg-teal-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-teal-900">Final Job Photos</h3>
        <p className="text-xs text-teal-700 mt-0.5">
          Upload final photos of the completed job for the data book. These photos are part of the
          official record.
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {savedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-300 group"
            >
              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={photo.url}
                  alt={photo.originalFilename}
                  className="w-full h-full object-cover"
                />
              </a>
              <button
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
            </div>
          ))}
          {!noPhotos && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-24 h-24 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50 transition-colors"
            >
              {isUploading ? (
                <span className="text-xs">...</span>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-[10px] mt-0.5">Add Photo</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {savedPhotos.length === 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={noPhotos}
              onChange={(e) => {
                setNoPhotos(e.target.checked);
                if (e.target.checked) {
                  setIsSaved(false);
                }
              }}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
            />
            <span className="text-sm text-gray-700">No Photos to Upload</span>
          </label>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Photos"}
          </button>
          {saveSuccess && <span className="text-xs text-green-600 font-medium">Saved</span>}
          {isSaved && !saveSuccess && (
            <span className="text-xs text-gray-500">Photos confirmed</span>
          )}
        </div>
      </div>
    </div>
  );
}
