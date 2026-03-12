"use client";

import { Download, FileStack, Loader2, Printer, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTemplatesList, useGenerateTemplate } from "@/app/lib/query/hooks";

type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: { name: string; label: string; type: string }[];
};

const CATEGORY_COLORS: Record<string, string> = {
  Privacy: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Corporate: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Labour: "bg-green-500/20 text-green-400 border-green-500/30",
  Safety: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

function CategoryBadge({ category }: { category: string }) {
  const colorClass =
    CATEGORY_COLORS[category] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
    >
      {category}
    </span>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: (t: Template) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-left hover:border-teal-500/50 hover:bg-slate-800/80 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">
          {template.name}
        </h3>
        <CategoryBadge category={template.category} />
      </div>
      <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
      <p className="text-xs text-teal-500 mt-3 font-medium">
        {template.fields.length} field{template.fields.length !== 1 ? "s" : ""} required
      </p>
    </button>
  );
}

function TemplateForm({ template, onClose }: { template: Template; onClose: () => void }) {
  const [formData, setFormData] = useState<Record<string, string>>(
    template.fields.reduce(
      (acc, field) => ({ ...acc, [field.name]: "" }),
      {} as Record<string, string>,
    ),
  );
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const generateMutation = useGenerateTemplate();
  const previewRef = useRef<HTMLDivElement>(null);

  function handleFieldChange(fieldName: string, value: string) {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  }

  function handleGenerate() {
    generateMutation.mutate(
      { templateId: template.id, data: formData },
      { onSuccess: (result) => setGeneratedHtml(result.html) },
    );
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (printWindow && generatedHtml) {
      printWindow.document.write(`
        <html>
          <head><title>${template.name}</title></head>
          <body>${generatedHtml}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-white">{template.name}</h3>
          <p className="text-xs text-slate-400">{template.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {!generatedHtml ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {template.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type === "date" ? "date" : "text"}
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}
            </div>

            {generateMutation.error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                {generateMutation.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Document"
              )}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg text-sm font-medium transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => setGeneratedHtml(null)}
                className="text-sm text-slate-400 hover:text-white transition-colors ml-auto"
              >
                Back to form
              </button>
            </div>
            <div
              ref={previewRef}
              className="bg-white rounded-lg p-6 text-black prose prose-sm max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: AI-generated template preview
              dangerouslySetInnerHTML={{ __html: generatedHtml }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplatesList();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const templatesList = (templates ?? []) as Template[];
  const categories = [...new Set(templatesList.map((t) => t.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileStack className="h-7 w-7 text-teal-400" />
          Document Templates
        </h1>
        <p className="text-slate-400 mt-1">Generate compliance documents from templates</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
        </div>
      ) : selectedTemplate ? (
        <TemplateForm template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesList
                  .filter((t) => t.category === category)
                  .map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={setSelectedTemplate}
                    />
                  ))}
              </div>
            </div>
          ))}
          {templatesList.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <FileStack className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No templates available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
