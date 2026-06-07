"use client";

import { PhotoCapture } from "@/app/components/PhotoCapture";
import { useToast } from "@/app/components/Toast";
import {
  useOrbitMyProfileStatus,
  useOrbitRemoveProfilePhoto,
  useOrbitSetProfilePhotoVisibility,
  useOrbitUploadProfilePhoto,
} from "@/app/lib/query/hooks";

export function ProfilePhotoAvatar() {
  const { data: status } = useOrbitMyProfileStatus();
  const upload = useOrbitUploadProfilePhoto();
  const remove = useOrbitRemoveProfilePhoto();
  const setVisibility = useOrbitSetProfilePhotoVisibility();
  const { showToast } = useToast();

  const photoUrl = status ? status.photoUrl : null;
  const visible = status ? status.photoVisibleToEmployers : true;

  const handleUpload = async (file: File) => {
    try {
      await upload.mutateAsync({ file });
      showToast("Profile photo updated.", "success");
    } catch {
      showToast("Couldn't upload that photo — please try again.", "error");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
      <div className="shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Your profile photo"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-white/40"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-white/10 ring-2 ring-white/25 flex items-center justify-center text-white/45">
            <svg
              className="h-11 w-11"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a7.5 7.5 0 0115 0v.75H4.5v-.75z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="space-y-2 flex-1">
        <p className="text-sm font-medium text-white">Profile photo</p>
        <p className="text-xs text-white/70 max-w-md">
          Optional. A clear headshot helps employers put a face to your application. Take one with
          your camera or upload an image.
        </p>
        <PhotoCapture enableCamera onCapture={handleUpload} />
        {photoUrl ? (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisibility.mutate(e.target.checked)}
                className="rounded border-white/30 bg-white/10"
              />
              Show my photo to employers
            </label>
            <button
              type="button"
              onClick={() => remove.mutate()}
              className="text-xs font-medium text-red-300 hover:text-red-200"
            >
              Remove photo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
