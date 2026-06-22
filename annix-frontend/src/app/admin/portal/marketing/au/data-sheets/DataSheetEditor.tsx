"use client";

import { useQueryClient } from "@tanstack/react-query";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import type {
  CompoundSpecDto,
  CreateCompoundDataSheetDto,
  UpdateCompoundDataSheetDto,
} from "@/app/lib/api/auRubberApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useAuCmsDataSheet } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";

const CATEGORIES = [
  "Natural Rubber Lining",
  "Premium Silica-Reinforced",
  "Specialty Compounds",
  "Branded Grades",
];

const CURE_METHODS = ["Steam-Cured", "Pre-Cured"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface FormState {
  name: string;
  slug: string;
  code: string;
  category: string;
  polymer: string;
  shoreHardness: string;
  colour: string;
  cureMethod: string;
  shortDescription: string;
  applications: string;
  notRecommended: string;
  specs: CompoundSpecDto[];
  pdfUrl: string | null;
  pdfStatus: string;
  revision: string;
  metaTitle: string;
  metaDescription: string;
  sortOrder: number;
  isPublished: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  code: "",
  category: "Natural Rubber Lining",
  polymer: "Natural Rubber",
  shoreHardness: "",
  colour: "Black",
  cureMethod: "Steam-Cured",
  shortDescription: "",
  applications: "",
  notRecommended: "",
  specs: [{ label: "Shore hardness", value: "", method: "ISO 48-2010" }],
  pdfUrl: null,
  pdfStatus: "coming_soon",
  revision: "",
  metaTitle: "",
  metaDescription: "",
  sortOrder: 0,
  isPublished: false,
};

interface DataSheetEditorProps {
  sheetId: string;
  onCreated?: (id: string) => void;
  onDeleted?: (id: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export interface DataSheetEditorHandle {
  save: () => Promise<void>;
}

function buildDto(form: FormState): CreateCompoundDataSheetDto {
  const name = form.name.trim();
  const slug = form.slug.trim().length > 0 ? slugify(form.slug) : slugify(name);
  const applications = form.applications
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const specs = form.specs.filter(
    (spec) => spec.label.trim().length > 0 || spec.value.trim().length > 0,
  );

  return {
    name,
    slug,
    code: form.code.trim(),
    category: form.category,
    polymer: form.polymer.trim(),
    shoreHardness: form.shoreHardness.trim(),
    colour: form.colour.trim(),
    cureMethod: form.cureMethod,
    shortDescription: form.shortDescription.trim(),
    applications,
    notRecommended: form.notRecommended.trim(),
    specs,
    pdfUrl: form.pdfUrl,
    pdfStatus: form.pdfStatus,
    revision: form.revision.trim(),
    metaTitle: form.metaTitle.trim() || null,
    metaDescription: form.metaDescription.trim() || null,
    sortOrder: form.sortOrder,
    isPublished: form.isPublished,
  };
}

export const DataSheetEditor = forwardRef<DataSheetEditorHandle, DataSheetEditorProps>(
  function DataSheetEditor(props, ref) {
    const sheetId = props.sheetId;
    const onCreated = props.onCreated;
    const onDeleted = props.onDeleted;
    const onMoveLeft = props.onMoveLeft;
    const onMoveRight = props.onMoveRight;
    const canMoveLeft = props.canMoveLeft;
    const canMoveRight = props.canMoveRight;
    const isNew = sheetId === "new";
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirm();
    const queryClient = useQueryClient();

    const sheetQuery = useAuCmsDataSheet(isNew ? "" : sheetId);
    const existing = sheetQuery.data;

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [loaded, setLoaded] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
      if (!existing || loaded) return;
      const metaTitle = existing.metaTitle;
      const metaDescription = existing.metaDescription;
      setForm({
        name: existing.name,
        slug: existing.slug,
        code: existing.code,
        category: existing.category,
        polymer: existing.polymer,
        shoreHardness: existing.shoreHardness,
        colour: existing.colour,
        cureMethod: existing.cureMethod,
        shortDescription: existing.shortDescription,
        applications: existing.applications.join("\n"),
        notRecommended: existing.notRecommended,
        specs: existing.specs.length > 0 ? existing.specs : EMPTY_FORM.specs,
        pdfUrl: existing.pdfUrl,
        pdfStatus: existing.pdfStatus,
        revision: existing.revision,
        metaTitle: metaTitle || "",
        metaDescription: metaDescription || "",
        sortOrder: existing.sortOrder,
        isPublished: existing.isPublished,
      });
      setLoaded(true);
      setDirty(false);
    }, [existing, loaded]);

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setDirty(true);
      setForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateSpec = (index: number, key: keyof CompoundSpecDto, value: string) => {
      setDirty(true);
      setForm((prev) => ({
        ...prev,
        specs: prev.specs.map((spec, i) => (i === index ? { ...spec, [key]: value } : spec)),
      }));
    };

    const addSpec = () => {
      setDirty(true);
      setForm((prev) => ({
        ...prev,
        specs: [...prev.specs, { label: "", value: "", method: "" }],
      }));
    };

    const removeSpec = (index: number) => {
      setDirty(true);
      setForm((prev) => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }));
    };

    const handleUploadPdf = async (file: File) => {
      setUploading(true);
      try {
        const result = await auCmsAdminApi.uploadDataSheetPdf(file);
        setDirty(true);
        setForm((prev) => ({ ...prev, pdfUrl: result.url, pdfStatus: "available" }));
        showToast("PDF uploaded", "success");
      } catch {
        showToast("Failed to upload PDF", "error");
      } finally {
        setUploading(false);
      }
    };

    const handleSave = async () => {
      if (form.name.trim().length === 0) {
        showToast("Name is required", "error");
        return;
      }
      const dto = buildDto(form);
      setSaving(true);
      try {
        if (isNew) {
          const created = await auCmsAdminApi.createDataSheet(dto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
          setDirty(false);
          showToast(`"${created.name}" created`, "success");
          onCreated?.(created.id);
        } else {
          await auCmsAdminApi.updateDataSheet(sheetId, dto as UpdateCompoundDataSheetDto);
          queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
          queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.detail(sheetId) });
          setDirty(false);
          showToast("Data sheet saved", "success");
        }
      } catch {
        showToast("Failed to save data sheet", "error");
      } finally {
        setSaving(false);
      }
    };

    const autoSave = async () => {
      if (isNew) {
        if (form.name.trim().length === 0) {
          return;
        }
        const dto = buildDto(form);
        await auCmsAdminApi.createDataSheet(dto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
        setDirty(false);
        return;
      }
      if (dirty) {
        const dto = buildDto(form);
        await auCmsAdminApi.updateDataSheet(sheetId, dto as UpdateCompoundDataSheetDto);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
        queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.detail(sheetId) });
        setDirty(false);
      }
    };

    useImperativeHandle(ref, () => ({ save: autoSave }), [autoSave]);

    const handleTogglePublish = async () => {
      const next = !form.isPublished;
      setTogglingPublish(true);
      try {
        await auCmsAdminApi.updateDataSheet(sheetId, { isPublished: next });
        setForm((prev) => ({ ...prev, isPublished: next }));
        queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
        queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.detail(sheetId) });
        showToast(next ? "Data sheet published" : "Data sheet unpublished", "success");
      } catch {
        showToast("Failed to update publish state", "error");
      } finally {
        setTogglingPublish(false);
      }
    };

    const sheetName = form.name;

    const handleDelete = async () => {
      const confirmed = await confirm({
        title: "Delete Data Sheet",
        message: `Delete "${sheetName || "this data sheet"}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!confirmed) {
        return;
      }
      setDeleting(true);
      try {
        await auCmsAdminApi.deleteDataSheet(sheetId);
        queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
        showToast("Data sheet deleted", "success");
        onDeleted?.(sheetId);
      } catch {
        showToast("Failed to delete data sheet", "error");
      } finally {
        setDeleting(false);
      }
    };

    const inputClass =
      "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    if (!isNew && sheetQuery.isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {ConfirmDialog}
        <div className="sticky top-[105px] z-[4] -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-6 py-2 backdrop-blur">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? "New data sheet" : sheetName || "Untitled data sheet"}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && onMoveLeft ? (
              <button
                type="button"
                onClick={onMoveLeft}
                disabled={!canMoveLeft}
                title="Move earlier"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ◀
              </button>
            ) : null}
            {!isNew && onMoveRight ? (
              <button
                type="button"
                onClick={onMoveRight}
                disabled={!canMoveRight}
                title="Move later"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ▶
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isNew || togglingPublish}
              className={
                form.isPublished
                  ? "inline-flex items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  : "inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              }
            >
              {form.isPublished ? "● Live" : "○ Draft"}
            </button>
            {!isNew ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
          <div>
            <label className={labelClass}>Product name *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="AU 40 Shore Black Steam-Cured Natural Rubber Lining"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Slug</label>
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => update("slug", e.target.value)}
                placeholder="auto from name if blank"
              />
            </div>
            <div>
              <label className={labelClass}>Product code</label>
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => update("code", e.target.value)}
                placeholder="AU-A40-BSC"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cure method</label>
              <select
                className={inputClass}
                value={form.cureMethod}
                onChange={(e) => update("cureMethod", e.target.value)}
              >
                {CURE_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Polymer</label>
              <input
                className={inputClass}
                value={form.polymer}
                onChange={(e) => update("polymer", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Shore hardness</label>
              <input
                className={inputClass}
                value={form.shoreHardness}
                onChange={(e) => update("shoreHardness", e.target.value)}
                placeholder="40 ±5 IRHD"
              />
            </div>
            <div>
              <label className={labelClass}>Colour</label>
              <input
                className={inputClass}
                value={form.colour}
                onChange={(e) => update("colour", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Short description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.shortDescription}
              onChange={(e) => update("shortDescription", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Applications (one per line)</label>
            <textarea
              className={inputClass}
              rows={4}
              value={form.applications}
              onChange={(e) => update("applications", e.target.value)}
              placeholder={"Tank & vessel linings\nChutes & launders\nSlurry pipelines"}
            />
          </div>

          <div>
            <label className={labelClass}>Not recommended for</label>
            <input
              className={inputClass}
              value={form.notRecommended}
              onChange={(e) => update("notRecommended", e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Physical properties</label>
              <button
                type="button"
                onClick={addSpec}
                className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
              >
                + Add property
              </button>
            </div>
            <div className="space-y-2">
              {form.specs.map((spec, index) => {
                const method = spec.method;
                return (
                  <div key={`spec-${index}`} className="flex gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      value={spec.label}
                      onChange={(e) => updateSpec(index, "label", e.target.value)}
                      placeholder="Property"
                    />
                    <input
                      className={`${inputClass} flex-1`}
                      value={spec.value}
                      onChange={(e) => updateSpec(index, "value", e.target.value)}
                      placeholder="Value"
                    />
                    <input
                      className={`${inputClass} flex-1`}
                      value={method || ""}
                      onChange={(e) => updateSpec(index, "method", e.target.value)}
                      placeholder="Test method"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(index)}
                      className="px-2 text-red-500 hover:text-red-700"
                      aria-label="Remove property"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data sheet PDF</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const fileList = e.target.files;
                  const file = fileList && fileList.length > 0 ? fileList[0] : null;
                  if (file) handleUploadPdf(file);
                }}
                className="text-sm"
              />
              {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
              {form.pdfUrl !== null && (
                <p className="text-xs text-green-700 mt-1 truncate">Attached: {form.pdfUrl}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>PDF status</label>
              <select
                className={inputClass}
                value={form.pdfStatus}
                onChange={(e) => update("pdfStatus", e.target.value)}
              >
                <option value="available">Available (show download)</option>
                <option value="coming_soon">Coming soon (hide download)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Revision</label>
              <input
                className={inputClass}
                value={form.revision}
                onChange={(e) => update("revision", e.target.value)}
                placeholder="Rev 3 · Jul 2025"
              />
            </div>
            <div>
              <label className={labelClass}>Sort order</label>
              <input
                type="number"
                className={inputClass}
                value={form.sortOrder}
                onChange={(e) => update("sortOrder", Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => update("isPublished", e.target.checked)}
                  className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                />
                Published
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Meta title (SEO)</label>
              <input
                className={inputClass}
                value={form.metaTitle}
                onChange={(e) => update("metaTitle", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Meta description (SEO)</label>
              <input
                className={inputClass}
                value={form.metaDescription}
                onChange={(e) => update("metaDescription", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
