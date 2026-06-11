"use client";

import { values } from "es-toolkit/compat";
import { PhotoCapture } from "@/app/components/PhotoCapture";
import { useToast } from "@/app/components/Toast";
import type { IndividualDocument } from "@/app/lib/api/annixOrbitApi";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useOrbitUploadMyDocumentPhoto } from "@/app/lib/query/hooks";

interface CredentialPhotoCaptureProps {
  kind: "qualification" | "certificate";
  allowed: boolean;
}

export function CredentialPhotoCapture(props: CredentialPhotoCaptureProps) {
  const { kind, allowed } = props;
  const uploadPhoto = useOrbitUploadMyDocumentPhoto();
  const { runBulk } = useAdaptiveExtractionProgress();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const noun = kind === "qualification" ? "qualification" : "certificate";

  const handleCapture = async (file: File) => {
    let createdDoc: IndividualDocument | null = null;
    const result = await runBulk({
      brand: "annix-orbit",
      metricCategory: "annix-orbit-nix-seeker",
      metricOperation: "credential-photo",
      items: [file],
      itemId: () => "photo",
      itemLabel: () => "Reading your document with Nix…",
      run: async (captured) => {
        createdDoc = await uploadPhoto.mutateAsync({ file: captured, kind });
      },
    });
    if (result.failed.length > 0) {
      alert({
        message: "We couldn't read that photo — please try again or upload a file.",
        variant: "error",
      });
      return;
    }
    const captured = createdDoc as IndividualDocument | null;
    const fields = captured ? captured.credentialFields : null;
    const fieldValues = fields ? values(fields) : [];
    const readable = fieldValues.some((value) => value != null && value !== "");
    if (!readable) {
      showToast(
        "Nix couldn't read that photo clearly — tap 'Edit details' to fill it in, or retake.",
        "info",
      );
      return;
    }
    showToast("Photo added. Remember to upload a clear scan later for employers.", "success");
  };

  if (!allowed) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--brand-navbar-200,#c0c0eb)] bg-[var(--brand-navbar-50,#f0f0fc)] px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--brand-navbar-active,#252560)]">
              Snap a photo of your {noun}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Capture a {noun} with your camera and Nix reads it instantly.
            </p>
          </div>
          <span className="text-[11px] font-medium text-[var(--brand-navbar-active,#252560)] bg-[var(--brand-navbar-100,#e0e0f5)] px-2 py-0.5 rounded-full whitespace-nowrap">
            Pathfinder &amp; Trailblazer
          </span>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Available on the Pathfinder and Trailblazer plans"
          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Take Photo (locked)
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--brand-navbar-200,#c0c0eb)] bg-[var(--brand-navbar-50,#f0f0fc)] px-3 py-3 space-y-2">
      {AlertDialog}
      <div>
        <p className="text-sm font-medium text-[var(--brand-navbar-active,#252560)]">
          📷 Snap a photo of your {noun}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Nix reads the photo to fill in the details. It stays private — add a clear scan later so
          we can show it to employers.
        </p>
      </div>
      <PhotoCapture enableCamera onCapture={handleCapture} />
    </div>
  );
}
