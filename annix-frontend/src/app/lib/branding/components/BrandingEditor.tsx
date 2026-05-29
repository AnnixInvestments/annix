"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  BRAND_FONT_OPTIONS,
  BRAND_LOADING_ANIMATIONS,
  type Branding,
  type BrandingAssetSlot,
  type BrandingAssetVariant,
  type BrandingUpdate,
  brandHasAsset,
  brandingFallback,
  googleFontsHref,
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
  heroWords: string;
  fontDisplay: string;
  fontHeadings: string;
  fontBody: string;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  watermarkMaxSizePx: number;
  loadingAnimation: string;
}

type ColorKey =
  | "navbarColor"
  | "accentOrange"
  | "accentOrangeLight"
  | "accentOrangeDark"
  | "gradientFrom"
  | "gradientVia"
  | "gradientTo";

const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "navbarColor", label: "Toolbar" },
  { key: "accentOrange", label: "Accent" },
  { key: "accentOrangeLight", label: "Accent light" },
  { key: "accentOrangeDark", label: "Accent dark" },
  { key: "gradientFrom", label: "Gradient — from" },
  { key: "gradientVia", label: "Gradient — via" },
  { key: "gradientTo", label: "Gradient — to" },
];

type FontKey = "fontDisplay" | "fontHeadings" | "fontBody";

const FONT_FIELDS: { key: FontKey; label: string; hint: string }[] = [
  { key: "fontDisplay", label: "Display", hint: "Big brand lettering — defaults to Orbitron." },
  { key: "fontHeadings", label: "Headings", hint: "Section headings — defaults to Exo 2." },
  { key: "fontBody", label: "Body", hint: "Paragraphs and UI text — defaults to Inter." },
];

interface AssetFieldDef {
  key: BrandingAssetSlot;
  label: string;
  hint: string;
}

const LAYER_FIELDS: AssetFieldDef[] = [
  { key: "logoIcon", label: "Orbital mark", hint: "Square icon shown in the toolbar." },
  { key: "wordmark", label: "ANNIX wordmark", hint: "The ANNIX text logo." },
  { key: "subMark", label: "App-title sub-mark", hint: "The app name, e.g. INVESTMENTS." },
  { key: "flashLine", label: "Flash line", hint: "Orange horizon flare accent." },
  { key: "logoLockup", label: "Full lockup", hint: "The complete composite artwork." },
  { key: "favicon", label: "Favicon", hint: "Shown in the browser tab." },
  { key: "watermark", label: "Background watermark", hint: "Faded hero behind pages." },
  { key: "textCrop", label: "Text image", hint: "Horizontal text logo — navbar & login." },
];

const HERO_IMAGE_FIELD: AssetFieldDef = {
  key: "heroImage",
  label: "Hero words image",
  hint: "Optional artwork that overrides the typed pillar tagline.",
};

const ALL_FIELDS: AssetFieldDef[] = [...LAYER_FIELDS, HERO_IMAGE_FIELD];

const SLOT_TO_FIELD: Record<
  BrandingAssetSlot,
  { light: keyof BrandingUpdate; dark: keyof BrandingUpdate }
> = {
  logoIcon: { light: "logoIconPath", dark: "logoIconPathDark" },
  logoLockup: { light: "logoLockupPath", dark: "logoLockupPathDark" },
  wordmark: { light: "wordmarkPath", dark: "wordmarkPathDark" },
  favicon: { light: "faviconPath", dark: "faviconPathDark" },
  watermark: { light: "watermarkPath", dark: "watermarkPathDark" },
  textCrop: { light: "textCropPath", dark: "textCropPathDark" },
  subMark: { light: "subMarkPath", dark: "subMarkPathDark" },
  flashLine: { light: "flashLinePath", dark: "flashLinePathDark" },
  heroImage: { light: "heroImagePath", dark: "heroImagePathDark" },
};

const ASSET_SLOTS: BrandingAssetSlot[] = [
  "logoIcon",
  "logoLockup",
  "wordmark",
  "favicon",
  "watermark",
  "textCrop",
  "subMark",
  "flashLine",
  "heroImage",
];

const MASTER_LABEL = "Annix Investments";

type VariantUrls = { light: string; dark: string };
type AssetPreviewMap = Record<BrandingAssetSlot, VariantUrls>;
type AssetChangeEntry = { light?: string | null; dark?: string | null };
type AssetChangeMap = Partial<Record<BrandingAssetSlot, AssetChangeEntry>>;

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
    heroWords: branding.heroWords,
    fontDisplay: branding.fontDisplay,
    fontHeadings: branding.fontHeadings,
    fontBody: branding.fontBody,
    watermarkEnabled: branding.watermarkEnabled,
    watermarkOpacity: branding.watermarkOpacity,
    watermarkMaxSizePx: branding.watermarkMaxSizePx,
    loadingAnimation: branding.loadingAnimation,
  };
}

function previewsFromBranding(branding: Branding): AssetPreviewMap {
  return ASSET_SLOTS.reduce<AssetPreviewMap>((acc, slot) => {
    acc[slot] = {
      light: resolveBrandAssetUrl(slot, branding, "light"),
      dark: resolveBrandAssetUrl(slot, branding, "dark"),
    };
    return acc;
  }, {} as AssetPreviewMap);
}

function splitHeroWords(value: string): string[] {
  return value.split(/[\s•·|/,]+/).filter((token) => token.length > 0);
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
  const [inherited, setInherited] = useState<Set<string>>(new Set());
  const [assetPreview, setAssetPreview] = useState<AssetPreviewMap>(() =>
    previewsFromBranding(brandingFallback(brand)),
  );
  const [assetChange, setAssetChange] = useState<AssetChangeMap>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<BrandingAssetVariant>("dark");

  const adminView = brandingQuery.data;

  useEffect(() => {
    if (!adminView) return;
    setForm(formFromBranding(adminView.own));
    setInherited(new Set(adminView.inheritedFields));
    setAssetPreview(previewsFromBranding(adminView.effective));
    setAssetChange({});
  }, [adminView]);

  const fontHref = form ? googleFontsHref({ ...form, brandCode: brand } as Branding) : null;
  useEffect(() => {
    if (!fontHref) return;
    const id = "branding-editor-fonts";
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    if (existing) {
      if (existing.href !== fontHref) existing.href = fontHref;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = fontHref;
    document.head.appendChild(link);
  }, [fontHref]);

  const setField = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) => {
    setForm((prev) => (prev ? ({ ...prev, [key]: value } as BrandingForm) : prev));
  };

  const toggleInherit = (field: string, inheritIt: boolean) => {
    setInherited((prev) => {
      const next = new Set(prev);
      if (inheritIt) {
        next.add(field);
      } else {
        next.delete(field);
      }
      return next;
    });
  };

  const handleUpload = async (
    slot: BrandingAssetSlot,
    variant: BrandingAssetVariant,
    file: File,
  ) => {
    const key = `${slot}:${variant}`;
    setUploadingKey(key);
    try {
      const result = await uploadMutation.mutateAsync({ slot, file });
      setAssetPreview((prev) => {
        const current = prev[slot];
        return { ...prev, [slot]: { ...current, [variant]: result.previewUrl } };
      });
      setAssetChange((prev) => {
        const existing = prev[slot];
        const current = existing || {};
        return { ...prev, [slot]: { ...current, [variant]: result.path } };
      });
      showToast("Uploaded — preview updated. Publish to go live.", "success");
    } catch {
      showToast("Upload failed — use a PNG/JPG/SVG under 2MB.", "error");
    } finally {
      setUploadingKey(null);
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
    const payload: BrandingUpdate = { ...form, inheritedFields: Array.from(inherited) };
    ALL_FIELDS.forEach((assetField) => {
      const slot = assetField.key;
      const change = assetChange[slot];
      if (!change) return;
      const fields = SLOT_TO_FIELD[slot];
      const lightValue = change.light;
      const darkValue = change.dark;
      if (lightValue !== undefined) {
        payload[fields.light] = lightValue as never;
      }
      if (darkValue !== undefined) {
        payload[fields.dark] = darkValue as never;
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

  if (brandingLoading || !form || !adminView) {
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

  const isMaster = adminView.isMaster;
  const master = adminView.master;
  const effective = adminView.effective;
  const ownView = adminView.own;

  const effectiveValue = <K extends keyof BrandingForm>(key: K): BrandingForm[K] => {
    if (!isMaster && inherited.has(key)) {
      return master[key as keyof Branding] as BrandingForm[K];
    }
    return form[key];
  };

  const slotHasAsset = (slot: BrandingAssetSlot, variant: BrandingAssetVariant): boolean => {
    const change = assetChange[slot];
    const changed = change ? change[variant] : undefined;
    if (changed !== undefined) {
      return changed !== null;
    }
    return brandHasAsset(slot, effective, variant);
  };

  const slotInheriting = (slot: BrandingAssetSlot, variant: BrandingAssetVariant): boolean => {
    if (isMaster) return false;
    const change = assetChange[slot];
    const changed = change ? change[variant] : undefined;
    if (changed !== undefined) return false;
    const ownHas = variant === "dark" ? ownView.assetsDark[slot] : ownView.assets[slot];
    const masterHas = variant === "dark" ? master.assetsDark[slot] : master.assets[slot];
    return !ownHas && masterHas;
  };

  const previewNavbar = effectiveValue("navbarColor");
  const previewAccent = effectiveValue("accentOrange");
  const previewGradFrom = effectiveValue("gradientFrom");
  const previewGradVia = effectiveValue("gradientVia");
  const previewGradTo = effectiveValue("gradientTo");
  const previewTagline = effectiveValue("tagline");
  const previewDescription = effectiveValue("description");
  const previewHeroWords = effectiveValue("heroWords");
  const previewFontDisplay = effectiveValue("fontDisplay");
  const previewFontHeadings = effectiveValue("fontHeadings");
  const previewFontBody = effectiveValue("fontBody");
  const previewWatermarkEnabled = effectiveValue("watermarkEnabled");
  const previewWatermarkOpacityRaw = effectiveValue("watermarkOpacity");
  const previewAnimation = effectiveValue("loadingAnimation");

  const watermarkOpacityForPreview = previewWatermarkEnabled ? previewWatermarkOpacityRaw : 0;
  const displayFontStack = `'${previewFontDisplay}', sans-serif`;
  const headingsFontStack = `'${previewFontHeadings}', sans-serif`;
  const bodyFontStack = `'${previewFontBody}', sans-serif`;
  const previewStyle = {
    "--brand-navbar": previewNavbar,
    "--brand-accent": previewAccent,
  } as React.CSSProperties;
  const previewGradient = `linear-gradient(to bottom right, ${previewGradFrom}, ${previewGradVia}, ${previewGradTo})`;

  const themeUrl = (slot: BrandingAssetSlot): string => assetPreview[slot][previewTheme];
  const logoPreview = themeUrl("logoIcon");
  const faviconPreview = assetPreview.favicon.light;
  const wordmarkPreview = themeUrl("wordmark");
  const subMarkPreview = themeUrl("subMark");
  const flashLinePreview = themeUrl("flashLine");
  const heroImagePreview = themeUrl("heroImage");
  const watermarkPreview = themeUrl("watermark");
  const textCropPreview = themeUrl("textCrop");

  const hasTextCrop = slotHasAsset("textCrop", previewTheme);
  const navbarTextUrl = hasTextCrop ? textCropPreview : wordmarkPreview;
  const showWordmarkLayer = slotHasAsset("wordmark", previewTheme);
  const showSubMarkLayer = slotHasAsset("subMark", previewTheme);
  const showFlashLineLayer = slotHasAsset("flashLine", previewTheme);
  const showHeroImageLayer = slotHasAsset("heroImage", previewTheme);
  const heroTokens = splitHeroWords(previewHeroWords);

  const heroIsLight = previewTheme === "light";
  const heroSurface = heroIsLight ? "#eef1f5" : previewGradient;
  const heroTextColor = heroIsLight ? "#0A1B3D" : "#ffffff";
  const heroSubText = heroIsLight ? "rgba(10,27,61,0.65)" : "rgba(255,255,255,0.7)";

  const isPublishing = updateMutation.isPending;
  const galleryData = imagesQuery.data;
  const galleryImages = galleryData ?? [];
  const addingImage = addImageMutation.isPending;

  const taglineInherited = !isMaster && inherited.has("tagline");
  const descriptionInherited = !isMaster && inherited.has("description");
  const heroWordsInherited = !isMaster && inherited.has("heroWords");
  const watermarkEnabledInherited = !isMaster && inherited.has("watermarkEnabled");
  const watermarkOpacityInherited = !isMaster && inherited.has("watermarkOpacity");
  const animationInherited = !isMaster && inherited.has("loadingAnimation");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title} — Branding</h1>
          <p className="text-gray-600 mt-1">
            {isMaster
              ? "This is the master Annix brand. Other apps inherit these values unless they override them."
              : "Upload logos and edit text/typography. Toggle Inherit on any field to follow the Annix Investments master brand. Changes go live when you publish."}
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
              {COLOR_FIELDS.map((colorField) => {
                const key = colorField.key;
                const fieldInherited = !isMaster && inherited.has(key);
                const ownValue = form[key];
                const masterValue = master[key];
                return (
                  <ColorField
                    key={key}
                    label={colorField.label}
                    value={ownValue}
                    onChange={(v) => setField(key, v)}
                    inheritable={!isMaster}
                    inherited={fieldInherited}
                    masterValue={masterValue}
                    onToggleInherit={(v) => toggleInherit(key, v)}
                  />
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Logo layers</h2>
            <p className="text-xs text-gray-500 mb-3">
              Each layer takes a Light variant (for light backgrounds) and a Dark variant (for dark
              backgrounds). PNG/JPG/SVG/WebP under 2MB. Leave a variant empty to inherit the{" "}
              {MASTER_LABEL} master asset.
            </p>
            <div className="space-y-2">
              {LAYER_FIELDS.map((field) => {
                const slot = field.key;
                const previews = assetPreview[slot];
                return (
                  <LayeredAssetRow
                    key={slot}
                    field={field}
                    previews={previews}
                    uploadingKey={uploadingKey}
                    lightInheriting={slotInheriting(slot, "light")}
                    darkInheriting={slotInheriting(slot, "dark")}
                    onFile={(variant, file) => handleUpload(slot, variant, file)}
                  />
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Hero words</h2>
            <p className="text-xs text-gray-500 mb-3">
              The pillar tagline (e.g.{" "}
              <span className="font-mono">QUOTE · BUILD · INSPECT · DELIVER</span>). Words render
              with accent-orange dot separators. Upload a Hero words image below to override the
              typed version with artwork.
            </p>
            <label className="block mb-4">
              <span className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Pillar tagline</span>
                {!isMaster ? (
                  <InheritCheckbox
                    inherited={heroWordsInherited}
                    onToggle={(v) => toggleInherit("heroWords", v)}
                  />
                ) : null}
              </span>
              <input
                type="text"
                value={heroWordsInherited ? master.heroWords : form.heroWords}
                maxLength={200}
                disabled={heroWordsInherited}
                placeholder="QUOTE · BUILD · INSPECT · DELIVER"
                onChange={(e) => setField("heroWords", e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
              />
            </label>
            <LayeredAssetRow
              field={HERO_IMAGE_FIELD}
              previews={assetPreview.heroImage}
              uploadingKey={uploadingKey}
              lightInheriting={slotInheriting("heroImage", "light")}
              darkInheriting={slotInheriting("heroImage", "dark")}
              onFile={(variant, file) => handleUpload("heroImage", variant, file)}
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Typography</h2>
            <p className="text-xs text-gray-500 mb-3">
              Fonts load from Google Fonts and preview live. Pick a listed family or type any Google
              Fonts name.
            </p>
            <div className="space-y-3">
              {FONT_FIELDS.map((fontField) => {
                const key = fontField.key;
                const fieldInherited = !isMaster && inherited.has(key);
                const value = fieldInherited ? (master[key] as string) : form[key];
                return (
                  <FontField
                    key={key}
                    label={fontField.label}
                    hint={fontField.hint}
                    value={value}
                    inheritable={!isMaster}
                    inherited={fieldInherited}
                    onChange={(v) => setField(key, v)}
                    onToggleInherit={(v) => toggleInherit(key, v)}
                  />
                );
              })}
            </div>
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Live preview</p>
            <div className="inline-flex rounded-lg border border-gray-300 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTheme("light")}
                className={`px-2.5 py-1 rounded-md ${
                  previewTheme === "light" ? "bg-gray-900 text-white" : "text-gray-600"
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme("dark")}
                className={`px-2.5 py-1 rounded-md ${
                  previewTheme === "dark" ? "bg-gray-900 text-white" : "text-gray-600"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
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
              <div className="relative h-80 overflow-hidden" style={{ background: heroSurface }}>
                <div
                  className="pointer-events-none absolute inset-0 bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('${watermarkPreview}')`,
                    backgroundSize: "min(70%, 240px)",
                    opacity: watermarkOpacityForPreview,
                  }}
                />
                {showFlashLineLayer ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-10 h-16 bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url('${flashLinePreview}')`,
                      backgroundSize: "contain",
                    }}
                  />
                ) : null}
                <div className="relative z-10 flex h-full flex-col justify-center p-5">
                  {showWordmarkLayer ? (
                    <span
                      className="h-10 w-44 bg-left bg-no-repeat"
                      style={{
                        backgroundImage: `url('${wordmarkPreview}')`,
                        backgroundSize: "contain",
                      }}
                    />
                  ) : (
                    <h3
                      className="text-3xl font-bold"
                      style={{ color: heroTextColor, fontFamily: displayFontStack }}
                    >
                      {title}
                    </h3>
                  )}
                  {showSubMarkLayer ? (
                    <span
                      className="mt-1 h-6 w-32 bg-left bg-no-repeat"
                      style={{
                        backgroundImage: `url('${subMarkPreview}')`,
                        backgroundSize: "contain",
                      }}
                    />
                  ) : null}
                  {showHeroImageLayer ? (
                    <span
                      className="mt-3 h-8 w-56 bg-left bg-no-repeat"
                      style={{
                        backgroundImage: `url('${heroImagePreview}')`,
                        backgroundSize: "contain",
                      }}
                    />
                  ) : heroTokens.length > 0 ? (
                    <p
                      className="mt-3 flex flex-wrap items-center gap-x-2 text-sm font-semibold uppercase tracking-wide"
                      style={{ color: heroTextColor, fontFamily: headingsFontStack }}
                    >
                      {heroTokens.map((token, index) => (
                        <span key={`${token}-${index}`} className="flex items-center gap-2">
                          {index > 0 ? (
                            <span style={{ color: "var(--brand-accent)" }}>•</span>
                          ) : null}
                          {token}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p
                    className="mt-3 text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "var(--brand-accent)", fontFamily: headingsFontStack }}
                  >
                    {previewTagline}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: heroSubText, fontFamily: bodyFontStack }}
                  >
                    {previewDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Watermark</h2>
            <InheritToggleRow
              show={!isMaster}
              inherited={watermarkEnabledInherited}
              onToggle={(v) => toggleInherit("watermarkEnabled", v)}
              label="Show watermark"
            />
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={form.watermarkEnabled}
                disabled={watermarkEnabledInherited}
                onChange={(e) => setField("watermarkEnabled", e.target.checked)}
                className="h-4 w-4 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">Show the background watermark</span>
            </label>
            <InheritToggleRow
              show={!isMaster}
              inherited={watermarkOpacityInherited}
              onToggle={(v) => toggleInherit("watermarkOpacity", v)}
              label="Opacity"
            />
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
              disabled={watermarkOpacityInherited}
              onChange={(e) => setField("watermarkOpacity", Number(e.target.value))}
              className="w-full disabled:opacity-50"
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-900">Loading animation</h2>
              {!isMaster ? (
                <InheritCheckbox
                  inherited={animationInherited}
                  onToggle={(v) => toggleInherit("loadingAnimation", v)}
                />
              ) : null}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              How the logo animates on loading screens. Pick a style — it previews live.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {BRAND_LOADING_ANIMATIONS.map((option) => {
                const isSelected = previewAnimation === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={animationInherited}
                    onClick={() => setField("loadingAnimation", option.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors disabled:opacity-50 ${
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
                <span className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Tagline</span>
                  {!isMaster ? (
                    <InheritCheckbox
                      inherited={taglineInherited}
                      onToggle={(v) => toggleInherit("tagline", v)}
                    />
                  ) : null}
                </span>
                <input
                  type="text"
                  value={taglineInherited ? master.tagline : form.tagline}
                  maxLength={200}
                  disabled={taglineInherited}
                  onChange={(e) => setField("tagline", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                />
              </label>
              <label className="block">
                <span className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Description</span>
                  {!isMaster ? (
                    <InheritCheckbox
                      inherited={descriptionInherited}
                      onToggle={(v) => toggleInherit("description", v)}
                    />
                  ) : null}
                </span>
                <textarea
                  value={descriptionInherited ? master.description : form.description}
                  maxLength={2000}
                  rows={2}
                  disabled={descriptionInherited}
                  onChange={(e) => setField("description", e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm resize-none disabled:bg-gray-50 disabled:text-gray-400"
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InheritCheckbox(props: { inherited: boolean; onToggle: (inherit: boolean) => void }) {
  const { inherited, onToggle } = props;
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
      <input
        type="checkbox"
        checked={inherited}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-3.5 w-3.5"
      />
      Inherit
    </label>
  );
}

function InheritToggleRow(props: {
  show: boolean;
  inherited: boolean;
  onToggle: (inherit: boolean) => void;
  label: string;
}) {
  const { show, inherited, onToggle, label } = props;
  if (!show) return null;
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] uppercase tracking-wide text-gray-400">{label}</span>
      <InheritCheckbox inherited={inherited} onToggle={onToggle} />
    </div>
  );
}

function FontField(props: {
  label: string;
  hint: string;
  value: string;
  inheritable: boolean;
  inherited: boolean;
  onChange: (v: string) => void;
  onToggleInherit: (inherit: boolean) => void;
}) {
  const { label, hint, value, inheritable, inherited, onChange, onToggleInherit } = props;
  const listId = `font-options-${label.toLowerCase()}`;
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        {inheritable ? <InheritCheckbox inherited={inherited} onToggle={onToggleInherit} /> : null}
      </span>
      <input
        type="text"
        list={listId}
        value={value}
        disabled={inherited}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
        style={{ fontFamily: `'${value}', sans-serif` }}
      />
      <datalist id={listId}>
        {BRAND_FONT_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <span className="mt-1 block text-xs text-gray-400">{hint}</span>
    </label>
  );
}

function VariantUpload(props: {
  variantLabel: string;
  previewUrl: string;
  busy: boolean;
  inheriting: boolean;
  onFile: (file: File) => void;
}) {
  const { variantLabel, previewUrl, busy, inheriting, onFile } = props;
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files;
    const file = dropped && dropped.length > 0 ? dropped[0] : null;
    if (file) onFile(file);
  };

  const swatchBg = variantLabel === "Dark" ? "bg-gray-900" : "bg-gray-100";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-1 items-center gap-2 rounded-lg border p-2 transition-colors ${
        dragOver ? "border-dashed border-violet-400 bg-violet-50" : "border-gray-200"
      }`}
    >
      <div
        className={`h-10 w-10 flex-shrink-0 rounded-lg border border-gray-200 bg-contain bg-center bg-no-repeat ${swatchBg}`}
        style={{ backgroundImage: `url('${previewUrl}')` }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-700">{variantLabel}</p>
        <p className={`text-[11px] ${inheriting ? "text-violet-500" : "text-gray-400"}`}>
          {inheriting ? `Inheriting ${MASTER_LABEL}` : "Empty inherits master"}
        </p>
      </div>
      <label className="cursor-pointer px-2.5 py-1 text-[11px] font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200">
        {busy ? "…" : "Upload"}
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

function LayeredAssetRow(props: {
  field: AssetFieldDef;
  previews: VariantUrls;
  uploadingKey: string | null;
  lightInheriting: boolean;
  darkInheriting: boolean;
  onFile: (variant: BrandingAssetVariant, file: File) => void;
}) {
  const { field, previews, uploadingKey, lightInheriting, darkInheriting, onFile } = props;
  const lightBusy = uploadingKey === `${field.key}:light`;
  const darkBusy = uploadingKey === `${field.key}:dark`;
  return (
    <div className="rounded-lg border border-gray-100 p-2">
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-900">{field.label}</p>
        <p className="text-xs text-gray-500">{field.hint}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <VariantUpload
          variantLabel="Light"
          previewUrl={previews.light}
          busy={lightBusy}
          inheriting={lightInheriting}
          onFile={(file) => onFile("light", file)}
        />
        <VariantUpload
          variantLabel="Dark"
          previewUrl={previews.dark}
          busy={darkBusy}
          inheriting={darkInheriting}
          onFile={(file) => onFile("dark", file)}
        />
      </div>
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

function ColorField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inheritable: boolean;
  inherited: boolean;
  masterValue: string;
  onToggleInherit: (inherit: boolean) => void;
}) {
  const { label, value, onChange, inheritable, inherited, onToggleInherit } = props;
  const masterValue = props.masterValue;
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

  const showInherited = inheritable && inherited;
  const displayValue = showInherited ? masterValue : value;

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-700 flex items-center gap-2">
        {label}
        {inheritable ? <InheritCheckbox inherited={inherited} onToggle={onToggleInherit} /> : null}
      </span>
      <div ref={ref} className="relative flex items-center gap-2">
        {showInherited ? (
          <>
            <span
              className="h-8 w-10 rounded border border-gray-300 opacity-70"
              style={{ backgroundColor: displayValue }}
            />
            <input
              type="text"
              value={displayValue}
              readOnly
              disabled
              className="w-24 rounded border border-gray-200 px-2 py-1 text-xs font-mono bg-gray-50 text-gray-400"
            />
          </>
        ) : (
          <>
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
          </>
        )}
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
