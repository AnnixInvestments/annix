"use client";

import { PhotoCapture } from "@/app/components/PhotoCapture";
import { useToast } from "@/app/components/Toast";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
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
  const noun = kind === "qualification" ? "qualification" : "certificate";

  const handleCapture = async (file: File) => {
    const result = await runBulk({
      brand: "annix-orbit",
      metricCategory: "annix-orbit-nix-seeker",
      metricOperation: "credential-photo",
      items: [file],
      itemId: () => "photo",
      itemLabel: () => "Reading your document with Nix…",
      run: async (captured) => {
        await uploadPhoto.mutateAsync({ file: captured, kind });
      },
    });
    if (result.failed.length > 0) {
      showToast("We couldn't read that photo — please try again or upload a file.", "error");
      return;
    }
    showToast("Photo added. Remember to upload a clear scan later for employers.", "success");
  };

  if (!allowed) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--brand-navbar-200,#c0c0eb)] bg-[var(--brand-navbar-50,#f0f0fc)] px-3 py-3">
        <p className="text-sm font-medium text-[var(--brand-navbar-active,#252560)]">
          📷 Snap a photo of your {noun}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Capture a {noun} with your camera and Nix reads it instantly. Available on the Pathfinder
          and Trailblazer plans.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--brand-navbar-200,#c0c0eb)] bg-[var(--brand-navbar-50,#f0f0fc)] px-3 py-3 space-y-2">
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
