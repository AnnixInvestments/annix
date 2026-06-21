"use client";

import { useState } from "react";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
}

export function ImageField(props: ImageFieldProps) {
  const value = props.value;
  const [uploading, setUploading] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const result = await auCmsAdminApi.uploadWebsiteImage(file);
      props.onChange(result.url);
    } catch {
      if (props.onError) {
        props.onError("Could not upload the image.");
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder="Image URL or upload a file"
          className={inputClass}
        />
        <label className="shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      {value ? (
        <img
          src={value}
          alt=""
          className="h-20 w-auto rounded border border-gray-200 bg-gray-50 object-contain"
        />
      ) : null}
    </div>
  );
}
