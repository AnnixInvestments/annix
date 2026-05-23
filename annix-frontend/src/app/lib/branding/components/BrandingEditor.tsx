"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  type Branding,
  type BrandingAssetSlot,
  type BrandingUpdate,
  resolveBrandAssetUrl,
} from "@/app/lib/branding/branding";
import { useAdminBranding, useUpdateBranding, useUploadBrandingAsset } from "@/app/lib/query/hooks";

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
}

const ASSET_FIELDS: { key: BrandingAssetSlot; label: string; hint: string }[] = [
  { key: "logoIcon", label: "Logo icon", hint: "Square mark shown in the toolbar." },
  { key: "logoLockup", label: "Full lockup", hint: "The complete brand artwork." },
  { key: "wordmark", label: "Wordmark", hint: "The text logo." },
  { key: "favicon", label: "Browser favicon", hint: "Shown in the browser tab." },
  { key: "watermark", label: "Background watermark", hint: "Faded hero behind pages." },
];

type BrandingAssetField =
  | "logoIconPath"
  | "logoLockupPath"
  | "wordmarkPath"
  | "faviconPath"
  | "watermarkPath";

const SLOT_TO_FIELD: Record<BrandingAssetSlot, BrandingAssetField> = {
  logoIcon: "logoIconPath",
  logoLockup: "logoLockupPath",
  wordmark: "wordmarkPath",
  favicon: "faviconPath",
  watermark: "watermarkPath",
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
  };
}

export function BrandingEditor(props: { brand: string; title: string; backHref?: string }) {
  const { brand, title } = props;
  const backHref = props.backHref;
  const { showToast } = useToast();
  const brandingQuery = useAdminBranding(brand);
  const updateMutation = useUpdateBranding(brand);
  const uploadMutation = useUploadBrandingAsset(brand);

  const [form, setForm] = useState<BrandingForm | null>(null);
  const [assetPreview, setAssetPreview] = useState<Record<BrandingAssetSlot, string>>({
    logoIcon: "",
    logoLockup: "",
    wordmark: "",
    favicon: "",
    watermark: "",
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

  const handlePublish = async () => {
    if (!form) return;
    const payload: BrandingUpdate = { ...form };
    ASSET_FIELDS.forEach((assetField) => {
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
  const isPublishing = updateMutation.isPending;

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
                  rows={3}
                  onChange={(e) => setField("description", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none"
                />
              </label>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Images</h2>
            <div className="space-y-4">
              {ASSET_FIELDS.map((field) => {
                const previewUrl = assetPreview[field.key];
                const isBusy = uploadingSlot === field.key;
                return (
                  <div key={field.key} className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-900 bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url('${previewUrl}')` }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{field.label}</p>
                      <p className="text-xs text-gray-500">{field.hint}</p>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200">
                      {isBusy ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                        className="hidden"
                        disabled={isBusy}
                        onChange={(e) => {
                          const fileList = e.target.files;
                          const file = fileList && fileList.length > 0 ? fileList[0] : null;
                          if (file) handleUpload(field.key, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

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
                  style={{ backgroundImage: `url('${wordmarkPreview}')` }}
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
        </div>
      </div>
    </div>
  );
}

function ColorField(props: { label: string; value: string; onChange: (v: string) => void }) {
  const { label, value, onChange } = props;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border border-gray-300 bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
        />
      </span>
    </div>
  );
}
