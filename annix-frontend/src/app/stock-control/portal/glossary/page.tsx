"use client";

import { useCallback, useMemo, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { type GlossaryTerm, stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { useGlossary } from "../../context/GlossaryContext";

export default function GlossaryPage() {
  const { profile } = useStockControlAuth();
  const { terms, hideTooltips, toggleTooltips, reloadTerms } = useGlossary();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [editForm, setEditForm] = useState({
    term: "",
    definition: "",
    category: "",
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = profile?.role === "admin";

  const categories = useMemo(() => {
    const cats = [...new Set(terms.map((t) => t.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [terms]);

  const filteredTerms = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return terms.filter((t) => {
      const matchesSearch =
        !search ||
        t.abbreviation.toLowerCase().includes(lowerSearch) ||
        t.term.toLowerCase().includes(lowerSearch) ||
        t.definition.toLowerCase().includes(lowerSearch);
      const matchesCategory = !activeCategory || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [terms, search, activeCategory]);

  const handleEdit = useCallback((t: GlossaryTerm) => {
    setEditingTerm(t);
    setEditForm({
      term: t.term,
      definition: t.definition,
      category: t.category || "",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingTerm) {
      return;
    }
    setSaving(true);
    try {
      await stockControlApiClient.upsertGlossaryTerm(editingTerm.abbreviation, {
        term: editForm.term,
        definition: editForm.definition,
        category: editForm.category || null,
      });
      reloadTerms();
      setEditingTerm(null);
    } finally {
      setSaving(false);
    }
  }, [editingTerm, editForm, reloadTerms]);

  const handleDelete = useCallback(
    async (abbreviation: string) => {
      await stockControlApiClient.deleteGlossaryTerm(abbreviation);
      reloadTerms();
    },
    [reloadTerms],
  );

  const handleResetAll = useCallback(async () => {
    await stockControlApiClient.resetGlossary();
    reloadTerms();
  }, [reloadTerms]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glossary</h1>
          <p className="text-sm text-gray-500 mt-1">
            Domain-specific terms and abbreviations used in the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset to defaults
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <span>Show tooltips</span>
            <button
              type="button"
              role="switch"
              aria-checked={!hideTooltips}
              onClick={toggleTooltips}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                !hideTooltips ? "bg-teal-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  !hideTooltips ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !activeCategory
              ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-teal-100 text-teal-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTerms.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">No terms match your search</div>
          )}
          {filteredTerms.map((t) => (
            <div
              key={`${t.abbreviation}-${t.companyId}`}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800">
                      {t.abbreviation}
                    </span>
                    <span className="font-medium text-gray-900 text-sm">{t.term}</span>
                    {t.category && <span className="text-xs text-gray-400">{t.category}</span>}
                    {t.isCustom && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.definition}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      title="Edit term"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    {t.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDelete(t.abbreviation)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        title="Delete custom term"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTerm && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Edit: {editingTerm.abbreviation}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <input
                    type="text"
                    value={editForm.term}
                    onChange={(e) => setEditForm((f) => ({ ...f, term: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Definition</label>
                  <textarea
                    value={editForm.definition}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        definition: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTerm(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
