"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isString } from "es-toolkit/compat";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CompoundSpecDto,
  type CreateCompoundDataSheetDto,
} from "@/app/lib/api/auRubberApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useAuRubberDataSheet } from "@/app/lib/query/hooks";
import { rubberKeys } from "@/app/lib/query/keys/rubberKeys";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

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

export default function DataSheetEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const queryClient = useQueryClient();

  const rawId = params.id;
  const id = isString(rawId) ? rawId : "";
  const isNew = id === "new";
  const sheetQuery = useAuRubberDataSheet(isNew ? "" : id);
  const existing = sheetQuery.data;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!existing) return;
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
  }, [existing]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSpec = (index: number, key: keyof CompoundSpecDto, value: string) => {
    setForm((prev) => ({
      ...prev,
      specs: prev.specs.map((spec, i) => (i === index ? { ...spec, [key]: value } : spec)),
    }));
  };

  const addSpec = () => {
    setForm((prev) => ({ ...prev, specs: [...prev.specs, { label: "", value: "", method: "" }] }));
  };

  const removeSpec = (index: number) => {
    setForm((prev) => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }));
  };

  const handleUploadPdf = async (file: File) => {
    setUploading(true);
    try {
      const result = await auRubberApiClient.uploadDataSheetPdf(file);
      setForm((prev) => ({ ...prev, pdfUrl: result.url, pdfStatus: "available" }));
      showToast("PDF uploaded", "success");
    } catch {
      alert({ message: "Failed to upload PDF", variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (name.length === 0) {
      alert({ message: "Name is required", variant: "error" });
      return;
    }
    const slug = form.slug.trim().length > 0 ? slugify(form.slug) : slugify(name);
    const applications = form.applications
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const specs = form.specs.filter(
      (spec) => spec.label.trim().length > 0 || spec.value.trim().length > 0,
    );

    const dto: CreateCompoundDataSheetDto = {
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

    setSaving(true);
    try {
      if (isNew) {
        await auRubberApiClient.createDataSheet(dto);
      } else {
        await auRubberApiClient.updateDataSheet(id, dto);
      }
      queryClient.invalidateQueries({ queryKey: rubberKeys.dataSheets.all });
      showToast("Data sheet saved", "success");
      router.push("/au-rubber/portal/website/data-sheets");
    } catch {
      alert({ message: "Failed to save data sheet", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/website"]}>
      {AlertDialog}
      <Breadcrumb
        items={[
          { label: "Website Pages", href: "/au-rubber/portal/website" },
          { label: "Data Sheets", href: "/au-rubber/portal/website/data-sheets" },
          { label: isNew ? "New" : "Edit" },
        ]}
      />

      <div className="px-6 py-4 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isNew ? "New Data Sheet" : "Edit Data Sheet"}
        </h1>

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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-5 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Data Sheet"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/au-rubber/portal/website/data-sheets")}
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
