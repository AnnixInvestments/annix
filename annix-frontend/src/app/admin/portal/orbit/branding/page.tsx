"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  ORBIT_STATIC_ASSET_DEFAULTS,
  type OrbitBranding,
  type OrbitBrandingAssetSlot,
  type OrbitBrandingUpdate,
  resolveOrbitAssetUrl,
} from "@/app/lib/annix-orbit/branding";
import {
  useAdminOrbitBranding,
  useUpdateOrbitBranding,
  useUploadOrbitBrandingAsset,
} from "@/app/lib/query/hooks";

interface BrandingForm {
  navbarColor: string;
  accentOrange: string;
  accentOrangeLight: string;
  accentOrangeDark: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
}

const ASSET_FIELDS: { key: OrbitBrandingAssetSlot; label: string; hint: string }[] = [
  { key: "logoIcon", label: "Logo icon", hint: "Square orbital mark shown in the toolbar." },
  { key: "wordmark", label: "Wordmark", hint: "The 'ANNIX ORBIT' text logo." },
  { key: "favicon", label: "Browser favicon", hint: "Shown in the browser tab." },
  { key: "watermark", label: "Background watermark", hint: "Faded hero behind every page." },
];

type OrbitBrandingAssetField = "logoIconPath" | "wordmarkPath" | "faviconPath" | "watermarkPath";

const SLOT_TO_FIELD: Record<OrbitBrandingAssetSlot, OrbitBrandingAssetField> = {
  logoIcon: "logoIconPath",
  wordmark: "wordmarkPath",
  favicon: "faviconPath",
  watermark: "watermarkPath",
};

function formFromBranding(branding: OrbitBranding): BrandingForm {
  return {
    navbarColor: branding.navbarColor,
    accentOrange: branding.accentOrange,
    accentOrangeLight: branding.accentOrangeLight,
    accentOrangeDark: branding.accentOrangeDark,
    gradientFrom: branding.gradientFrom,
    gradientVia: branding.gradientVia,
    gradientTo: branding.gradientTo,
    watermarkEnabled: branding.watermarkEnabled,
    watermarkOpacity: branding.watermarkOpacity,
    watermarkMaxSizePx: branding.watermarkMaxSizePx,
  };
}

export default function AdminOrbitBrandingPage() {
  const { showToast } = useToast();
  const brandingQuery = useAdminOrbitBranding();
  const updateMutation = useUpdateOrbitBranding();
  const uploadMutation = useUploadOrbitBrandingAsset();

  const [form, setForm] = useState<BrandingForm | null>(null);
  const [assetPreview, setAssetPreview] = useState<Record<OrbitBrandingAssetSlot, string>>({
    logoIcon: ORBIT_STATIC_ASSET_DEFAULTS.logoIcon,
    wordmark: ORBIT_STATIC_ASSET_DEFAULTS.wordmark,
    favicon: ORBIT_STATIC_ASSET_DEFAULTS.favicon,
    watermark: ORBIT_STATIC_ASSET_DEFAULTS.watermark,
  });
  const [assetChange, setAssetChange] = useState<
    Partial<Record<OrbitBrandingAssetSlot, string | null>>
  >({});
  const [uploadingSlot, setUploadingSlot] = useState<OrbitBrandingAssetSlot | null>(null);

  const brandingData = brandingQuery.data;

  useEffect(() => {
    if (!brandingData) return;
    setForm(formFromBranding(brandingData));
    setAssetPreview({
      logoIcon: resolveOrbitAssetUrl("logoIcon", brandingData),
      wordmark: resolveOrbitAssetUrl("wordmark", brandingData),
      favicon: resolveOrbitAssetUrl("favicon", brandingData),
      watermark: resolveOrbitAssetUrl("watermark", brandingData),
    });
    setAssetChange({});
  }, [brandingData]);

  const setField = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) => {
    setForm((prev) => (prev ? ({ ...prev, [key]: value } as BrandingForm) : prev));
  };

  const handleUpload = async (slot: OrbitBrandingAssetSlot, file: File) => {
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

  const handleUseDefault = (slot: OrbitBrandingAssetSlot) => {
    const defaultUrl = ORBIT_STATIC_ASSET_DEFAULTS[slot];
    setAssetPreview((prev) => ({ ...prev, [slot]: defaultUrl }));
    setAssetChange((prev) => ({ ...prev, [slot]: null }));
  };

  const handlePublish = async () => {
    if (!form) return;
    const payload: OrbitBrandingUpdate = { ...form };
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
      showToast("Branding published — it is now live across Annix Orbit.", "success");
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
    "--orbit-navbar": form.navbarColor,
    "--orbit-accent": form.accentOrange,
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
          <h1 className="text-2xl font-bold text-gray-900">Annix Orbit — Branding</h1>
          <p className="text-gray-600 mt-1">
            Edit colours, logo, favicon and the page watermark. Changes preview live and only go
            live when you publish.
          </p>
        </div>
        <Link
          href="/admin/portal/orbit/job-market"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap"
        >
          Job Market
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Colours</h2>
            <div className="divide-y divide-gray-100">
              <ColorField
                label="Navbar"
                value={form.navbarColor}
                onChange={(v) => setField("navbarColor", v)}
              />
              <ColorField
                label="Accent (orange)"
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
                    <div className="flex flex-col items-end gap-1">
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
                      <button
                        type="button"
                        onClick={() => handleUseDefault(field.key)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Use default
                      </button>
                    </div>
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
            <div className="space-y-3">
              <div>
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
              </div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">Max size (px)</span>
                <input
                  type="number"
                  min={120}
                  max={2000}
                  value={form.watermarkMaxSizePx}
                  onChange={(e) => setField("watermarkMaxSizePx", Number(e.target.value))}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
            </div>
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
                Annix Orbit
              </span>
            </div>

            <div style={previewStyle}>
              <div
                className="flex items-center gap-3 px-4 h-14"
                style={{ backgroundColor: "var(--orbit-navbar)" }}
              >
                <span
                  className="h-8 w-8 rounded-[18%] bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${logoPreview}')` }}
                />
                <span
                  className="h-6 w-28 bg-contain bg-left bg-no-repeat"
                  style={{ backgroundImage: `url('${wordmarkPreview}')` }}
                />
                <span
                  className="ml-auto flex gap-4 text-sm font-medium"
                  style={{ color: "var(--orbit-accent)" }}
                >
                  <span>Dashboard</span>
                  <span className="hidden sm:inline">Browse Jobs</span>
                </span>
              </div>

              <div
                className="relative h-80 overflow-hidden"
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
                <div className="relative z-10 p-4 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">Browse Jobs</h3>
                    <p className="text-white/70 text-sm">Sample of how seekers see the app.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PreviewJobCard accent={form.accentOrange} />
                    <PreviewJobCard accent={form.accentOrange} />
                  </div>
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

function PreviewJobCard(props: { accent: string }) {
  const { accent } = props;
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-sm font-bold text-gray-900">Site Manager</p>
      <p className="text-xs text-gray-500">Port Elizabeth</p>
      <div className="mt-3 flex justify-end">
        <span
          className="rounded px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: accent }}
        >
          View &amp; apply
        </span>
      </div>
    </div>
  );
}
