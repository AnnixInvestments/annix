"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  BRAND_LOADING_ANIMATIONS,
  type Branding,
  type BrandingAssetSlot,
  type BrandingUpdate,
  resolveBrandAssetUrl,
} from "@/app/lib/branding/branding";
import {
  useAddBrandingImage,
  useAdminBranding,
  useAdminBrandingImages,
  useDeleteBrandingImage,
  useUpdateBranding,
  useUploadBrandingAsset,
} from "@/app/lib/query/hooks";

interface BrandingForm {
  navbarColor: string;
  accentOrange: string;
  accentOrangeLight: string;
  accentOrangeDark: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  tagline: string;
  description: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
  loadingAnimation: string;
}

interface AssetFieldDef {
  key: BrandingAssetSlot;
  label: string;
  hint: string;
}

const ASSET_FIELDS: AssetFieldDef[] = [
  { key: "logoIcon", label: "Logo icon", hint: "Square mark shown in the toolbar." },
  { key: "logoLockup", label: "Full lockup", hint: "The complete brand artwork." },
  { key: "wordmark", label: "Wordmark", hint: "The text logo." },
  { key: "favicon", label: "Browser favicon", hint: "Shown in the browser tab." },
  { key: "watermark", label: "Background watermark", hint: "Faded hero behind pages." },
];

const TEXT_IMAGE_FIELD: AssetFieldDef = {
  key: "textCrop",
  label: "Text image",
  hint: "Horizontal text logo — shown in the navbar and on the login screen.",
};

const ALL_FIELDS: AssetFieldDef[] = [...ASSET_FIELDS, TEXT_IMAGE_FIELD];

type BrandingAssetField =
  | "logoIconPath"
  | "logoLockupPath"
  | "wordmarkPath"
  | "faviconPath"
  | "watermarkPath"
  | "textCropPath";

const SLOT_TO_FIELD: Record<BrandingAssetSlot, BrandingAssetField> = {
  logoIcon: "logoIconPath",
  logoLockup: "logoLockupPath",
  wordmark: "wordmarkPath",
  favicon: "faviconPath",
  watermark: "watermarkPath",
  textCrop: "textCropPath",
};

function formFromBranding(branding: Branding): BrandingForm {
  return {
    navbarColor: branding.navbarColor,
    accentOrange: branding.accentOrange,
    accentOrangeLight: branding.accentOrangeLight,
    accentOrangeDark: branding.accentOrangeDark,
    gradientFrom: branding.gradientFrom,
    gradientVia: branding.gradientVia,
    gradientTo: branding.gradientTo,
    tagline: branding.tagline,
    description: branding.description,
    watermarkEnabled: branding.watermarkEnabled,
    watermarkOpacity: branding.watermarkOpacity,
    watermarkMaxSizePx: branding.watermarkMaxSizePx,
    loadingAnimation: branding.loadingAnimation,
  };
}

export function BrandingEditor(props: { brand: string; title: string; backHref?: string }) {
  const { brand, title } = props;
  const backHref = props.backHref;
  const { showToast } = useToast();
  const brandingQuery = useAdminBranding(brand);
  const updateMutation = useUpdateBranding(brand);
  const uploadMutation = useUploadBrandingAsset(brand);
  const imagesQuery = useAdminBrandingImages(brand);
  const addImageMutation = useAddBrandingImage(brand);
  const deleteImageMutation = useDeleteBrandingImage(brand);
  const [newImageLabel, setNewImageLabel] = useState("");

  const [form, setForm] = useState<BrandingForm | null>(null);
  const [assetPreview, setAssetPreview] = useState<Record<BrandingAssetSlot, string>>({
    logoIcon: "",
    logoLockup: "",
    wordmark: "",
    favicon: "",
    watermark: "",
    textCrop: "",
  });
  const [assetChange, setAssetChange] = useState<Partial<Record<BrandingAssetSlot, string | null>>>(
    {},
  );
  const [uploadingSlot, setUploadingSlot] = useState<BrandingAssetSlot | null>(null);

  const brandingData = brandingQuery.data;

  useEffect(() => {
    if (!brandingData) return;
    setForm(formFromBranding(brandingData));
    setAssetPreview({
      logoIcon: resolveBrandAssetUrl("logoIcon", brandingData),
      logoLockup: resolveBrandAssetUrl("logoLockup", brandingData),
      wordmark: resolveBrandAssetUrl("wordmark", brandingData),
      favicon: resolveBrandAssetUrl("favicon", brandingData),
      watermark: resolveBrandAssetUrl("watermark", brandingData),
      textCrop: resolveBrandAssetUrl("textCrop", brandingData),
    });
    setAssetChange({});
  }, [brandingData]);

  const setField = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) => {
    setForm((prev) => (prev ? ({ ...prev, [key]: value } as BrandingForm) : prev));
  };

  const handleUpload = async (slot: BrandingAssetSlot, file: File) => {
    setUploadingSlot(slot);
    try {
      const result = await uploadMutation.mutateAsync({ slot, file });
      setAssetPreview((prev) => ({ ...prev, [slot]: result.previewUrl }));
      setAssetChange((prev) => ({ ...prev, [slot]: result.path }));
      showToast("Uploaded — preview updated. Publish to go live.", "success");
    } catch {
      showToast("Upload failed — use a PNG/JPG/SVG under 2MB.", "error");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleAddImage = async (file: File) => {
    try {
      await addImageMutation.mutateAsync({ file, label: newImageLabel.trim() });
      setNewImageLabel("");
      showToast("Image added to the gallery.", "success");
    } catch {
      showToast("Couldn't add the image — use a PNG/JPG/SVG under 2MB.", "error");
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteImageMutation.mutateAsync(id);
      showToast("Image removed from the gallery.", "success");
    } catch {
      showToast("Couldn't remove the image — please try again.", "error");
    }
  };

  const handlePublish = async () => {
    if (!form) return;
    const payload: BrandingUpdate = { ...form };
    ALL_FIELDS.forEach((assetField) => {
      const slot = assetField.key;
      const value = assetChange[slot];
      if (value !== undefined) {
        const targetField = SLOT_TO_FIELD[slot];
        payload[targetField] = value;
      }
    });
    try {
      await updateMutation.mutateAsync(payload);
      setAssetChange({});
      showToast(`${title} branding published — it is now live.`, "success");
    } catch {
      showToast("Could not publish branding — please try again.", "error");
    }
  };

  const brandingLoading = brandingQuery.isLoading;
  const brandingError = brandingQuery.isError;

  if (brandingLoading || !form) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
        Loading branding…
      </div>
    );
  }

  if (brandingError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
        Couldn't load branding. Try refreshing.
      </div>
    );
  }

  const watermarkOpacityForPreview = form.watermarkEnabled ? form.watermarkOpacity : 0;
  const previewStyle = {
    "--brand-navbar": form.navbarColor,
    "--brand-accent": form.accentOrange,
  } as React.CSSProperties;
  const previewGradient = `linear-gradient(to bottom right, ${form.gradientFrom}, ${form.gradientVia}, ${form.gradientTo})`;

  const logoPreview = assetPreview.logoIcon;
  const wordmarkPreview = assetPreview.wordmark;
  const watermarkPreview = assetPreview.watermark;
  const faviconPreview = assetPreview.favicon;
  const textCropPreview = assetPreview.textCrop;
  const textCropBusy = uploadingSlot === "textCrop";
  const hasTextCrop = brandingData ? brandingData.assets.textCrop : false;
  const navbarTextUrl = hasTextCrop ? textCropPreview : wordmarkPreview;
  const isPublishing = updateMutation.isPending;
  const galleryData = imagesQuery.data;
  const galleryImages = galleryData ?? [];
  const addingImage = addImageMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title} — Branding</h1>
          <p className="text-gray-600 mt-1">
            Upload logos and edit colours/text. Changes preview live and only go live when you
            publish.
          </p>
        </div>
        {backHref ? (
          <Link
            href={backHref}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap"
          >
            Back
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Colours</h2>
            <div className="divide-y divide-gray-100">
              <ColorField
                label="Toolbar"
                value={form.navbarColor}
                onChange={(v) => setField("navbarColor", v)}
              />
              <ColorField
                label="Accent"
                value={form.accentOrange}
                onChange={(v) => setField("accentOrange", v)}
              />
              <ColorField
                label="Accent light"
                value={form.accentOrangeLight}
                onChange={(v) => setField("accentOrangeLight", v)}
              />
              <ColorField
                label="Accent dark"
                value={form.accentOrangeDark}
                onChange={(v) => setField("accentOrangeDark", v)}
              />
              <ColorField
                label="Gradient — from"
                value={form.gradientFrom}
                onChange={(v) => setField("gradientFrom", v)}
              />
              <ColorField
                label="Gradient — via"
                value={form.gradientVia}
                onChange={(v) => setField("gradientVia", v)}
              />
              <ColorField
                label="Gradient — to"
                value={form.gradientTo}
                onChange={(v) => setField("gradientTo", v)}
              />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Images</h2>
            <p className="text-xs text-gray-500 mb-3">
              Drag an image onto a row, or click Upload. PNG/JPG/SVG/WebP under 2MB.
            </p>
            <div className="space-y-2">
              {ASSET_FIELDS.map((field) => {
                const previewUrl = assetPreview[field.key];
                const isBusy = uploadingSlot === field.key;
                return (
                  <AssetUploadRow
                    key={field.key}
                    field={field}
                    previewUrl={previewUrl}
                    busy={isBusy}
                    onFile={(file) => handleUpload(field.key, file)}
                  />
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Text image</h2>
            <p className="text-xs text-gray-500 mb-3">
              Horizontal text logo (text crop) — shown in the navbar and on the login screen. Drag &
              drop or click Upload.
            </p>
            <AssetUploadRow
              field={TEXT_IMAGE_FIELD}
              previewUrl={textCropPreview}
              busy={textCropBusy}
              onFile={(file) => handleUpload("textCrop", file)}
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Gallery</h2>
            <p className="text-xs text-gray-500 mb-3">
              Extra brand images stored for later use — add as many as you like, each with a label.
              These save immediately and don't appear anywhere automatically.
            </p>

            {galleryImages.length > 0 ? (
              <div className="space-y-2 mb-4">
                {galleryImages.map((img) => {
                  const url = `/api/public/branding/${brand}/image/${img.id}`;
                  const labelText = img.label;
                  return (
                    <div key={img.id} className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-900 bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url('${url}')` }}
                      />
                      <p className="min-w-0 flex-1 truncate text-sm text-gray-900">
                        {labelText || "Untitled"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">No extra images yet.</p>
            )}

            <GalleryAddRow
              label={newImageLabel}
              onLabelChange={setNewImageLabel}
              busy={addingImage}
              onFile={handleAddImage}
            />
          </section>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full py-3 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
          >
            {isPublishing ? "Publishing…" : "Save & publish"}
          </button>
        </div>

        <div className="lg:sticky lg:top-24 self-start space-y-2">
          <p className="text-sm font-medium text-gray-700">Live preview</p>
          <div className="rounded-xl border border-gray-300 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 bg-gray-200 px-3 py-2">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </span>
              <span className="flex items-center gap-1.5 ml-2 rounded bg-white px-2 py-0.5 text-xs text-gray-500">
                <span
                  className="h-3.5 w-3.5 rounded-[18%] bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${faviconPreview}')` }}
                />
                {title}
              </span>
            </div>
            <div style={previewStyle}>
              <div
                className="flex items-center gap-3 px-4 h-14"
                style={{ backgroundColor: "var(--brand-navbar)" }}
              >
                <span
                  className="h-8 w-8 rounded-[18%] bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${logoPreview}')` }}
                />
                <span
                  className="h-6 w-28 bg-contain bg-left bg-no-repeat"
                  style={{ backgroundImage: `url('${navbarTextUrl}')` }}
                />
              </div>
              <div
                className="relative h-72 overflow-hidden"
                style={{ backgroundImage: previewGradient }}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('${watermarkPreview}')`,
                    backgroundSize: "min(70%, 240px)",
                    opacity: watermarkOpacityForPreview,
                  }}
                />
                <div className="relative z-10 p-4">
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <p
                    className="text-xs font-semibold tracking-widest uppercase mt-1"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    {form.tagline}
                  </p>
                  <p className="text-white/70 text-xs mt-1">{form.description}</p>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Watermark</h2>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={form.watermarkEnabled}
                onChange={(e) => setField("watermarkEnabled", e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">Show the background watermark</span>
            </label>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Opacity</span>
              <span className="font-mono text-xs">{form.watermarkOpacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={form.watermarkOpacity}
              onChange={(e) => setField("watermarkOpacity", Number(e.target.value))}
              className="w-full"
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Loading animation</h2>
            <p className="text-xs text-gray-500 mb-3">
              How the logo animates on loading screens. Pick a style — it previews live.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {BRAND_LOADING_ANIMATIONS.map((option) => {
                const isSelected = form.loadingAnimation === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setField("loadingAnimation", option.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                      isSelected
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden">
                      <span
                        className={`h-8 w-8 rounded-[18%] bg-contain bg-center bg-no-repeat brand-anim-${option.key}`}
                        style={{ backgroundImage: `url('${logoPreview}')` }}
                      />
                    </span>
                    <span className="text-[11px] text-gray-600">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Text</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-700">Tagline</span>
                <input
                  type="text"
                  value={form.tagline}
                  maxLength={200}
                  onChange={(e) => setField("tagline", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700">Description</span>
                <textarea
                  value={form.description}
                  maxLength={2000}
                  rows={2}
                  onChange={(e) => setField("description", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm resize-none"
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AssetUploadRow(props: {
  field: AssetFieldDef;
  previewUrl: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const { field, previewUrl, busy, onFile } = props;
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files;
    const file = dropped && dropped.length > 0 ? dropped[0] : null;
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-3 rounded-lg border p-2 transition-colors ${
        dragOver ? "border-dashed border-violet-400 bg-violet-50" : "border-transparent"
      }`}
    >
      <div
        className="h-12 w-12 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-900 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${previewUrl}')` }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{field.label}</p>
        <p className="text-xs text-gray-500">{dragOver ? "Drop to upload…" : field.hint}</p>
      </div>
      <label className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200">
        {busy ? "Uploading…" : "Upload"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const fileList = e.target.files;
            const file = fileList && fileList.length > 0 ? fileList[0] : null;
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function GalleryAddRow(props: {
  label: string;
  onLabelChange: (v: string) => void;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const { label, onLabelChange, busy, onFile } = props;
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files;
    const file = dropped && dropped.length > 0 ? dropped[0] : null;
    if (file) onFile(file);
  };

  const buttonLabel = busy ? "Adding…" : dragOver ? "Drop to add" : "Add image";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-2 rounded-lg border border-dashed p-2 transition-colors ${
        dragOver ? "border-violet-400 bg-violet-50" : "border-gray-300"
      }`}
    >
      <input
        type="text"
        value={label}
        maxLength={200}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Label (optional)"
        className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs"
      />
      <label className="cursor-pointer whitespace-nowrap rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-200">
        {buttonLabel}
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const fileList = e.target.files;
            const file = fileList && fileList.length > 0 ? fileList[0] : null;
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function clampNum(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sf * Math.min(lf, 1 - lf);
  const f = (n: number) => lf - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  if (m.length < 6) return { h: 0, s: 0, l: 0 };
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function ColorField(props: { label: string; value: string; onChange: (v: string) => void }) {
  const { label, value, onChange } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const node = ref.current;
      if (node && !node.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <div ref={ref} className="relative flex items-center gap-2">
        <button
          type="button"
          aria-label={`Pick ${label} colour`}
          onClick={() => setOpen((o) => !o)}
          className="h-8 w-10 rounded border border-gray-300"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
        />
        {open ? <ColorPickerPopover value={value} onChange={onChange} /> : null}
      </div>
    </div>
  );
}

function ColorPickerPopover(props: { value: string; onChange: (v: string) => void }) {
  const { value, onChange } = props;
  const [hue, setHue] = useState(() => hexToHsl(value).h);

  useEffect(() => {
    setHue(hexToHsl(value).h);
  }, [value]);

  const handleHueClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHue(clampNum(Math.round(ratio * 360), 0, 360));
  };

  const saturations = [100, 80, 62, 44];
  const lightnesses = [94, 86, 76, 66, 56, 46, 36, 26];
  const selected = value.toLowerCase();

  return (
    <div className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
      <p className="text-xs font-medium text-gray-500 mb-1.5">Pick a colour</p>
      <button
        type="button"
        onClick={handleHueClick}
        aria-label="Choose hue"
        className="relative block h-4 w-full cursor-pointer rounded mb-3"
        style={{
          background:
            "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
        }}
      >
        <span
          className="absolute -top-0.5 h-5 w-1 rounded bg-white ring-1 ring-gray-600"
          style={{ left: `calc(${(hue / 360) * 100}% - 2px)` }}
        />
      </button>
      <div className="grid grid-cols-8 gap-1">
        {saturations.flatMap((s) =>
          lightnesses.map((l) => {
            const hex = hslToHex(hue, s, l);
            const isSelected = hex.toLowerCase() === selected;
            return (
              <button
                key={`${s}-${l}`}
                type="button"
                title={hex}
                onClick={() => onChange(hex)}
                className={`h-5 w-full rounded ${isSelected ? "ring-2 ring-offset-1 ring-gray-800" : "hover:scale-110 transition-transform"}`}
                style={{ backgroundColor: hex }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
