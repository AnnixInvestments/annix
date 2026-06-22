"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { auCmsAdminApi } from "@/app/lib/api/auCmsAdminApi";
import { useAuCmsDataSheets } from "@/app/lib/query/hooks";
import { auCmsKeys } from "@/app/lib/query/keys/auCmsKeys";
import { AuCmsHeader } from "../AuCmsHeader";
import { DataSheetEditor, type DataSheetEditorHandle } from "./DataSheetEditor";

export default function AuMarketingDataSheetsListPage() {
  const sheetsQuery = useAuCmsDataSheets();
  const rawData = sheetsQuery.data;
  const sheets = rawData || [];
  const sorted = [...sheets].sort((a, b) => a.sortOrder - b.sortOrder);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const editorRef = useRef<DataSheetEditorHandle>(null);
  const queryClient = useQueryClient();

  const autoSaveCurrent = async () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    try {
      await editor.save();
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  const switchToSheet = async (id: string) => {
    await autoSaveCurrent();
    setSelectedId(id);
  };

  useEffect(() => {
    if (defaultApplied || sheetsQuery.isLoading) return;
    const first = sorted.length > 0 ? sorted[0] : null;
    setSelectedId(first ? first.id : "new");
    setDefaultApplied(true);
  }, [defaultApplied, sheetsQuery.isLoading, sorted]);

  const activeId = selectedId;
  const activeIndex = activeId ? sorted.findIndex((s) => s.id === activeId) : -1;
  const canMoveLeft = activeIndex > 0;
  const canMoveRight = activeIndex >= 0 && activeIndex < sorted.length - 1;

  const swapSortOrder = async (index: number, targetIndex: number) => {
    const sheet = sorted[index];
    const target = sorted[targetIndex];
    if (!sheet || !target) {
      return;
    }
    await auCmsAdminApi.updateDataSheet(sheet.id, { sortOrder: target.sortOrder });
    await auCmsAdminApi.updateDataSheet(target.id, { sortOrder: sheet.sortOrder });
    queryClient.invalidateQueries({ queryKey: auCmsKeys.dataSheets.all });
  };

  const handleMoveLeft = async () => {
    if (activeIndex <= 0) {
      return;
    }
    await swapSortOrder(activeIndex, activeIndex - 1);
  };

  const handleMoveRight = async () => {
    if (activeIndex < 0 || activeIndex >= sorted.length - 1) {
      return;
    }
    await swapSortOrder(activeIndex, activeIndex + 1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <AuCmsHeader
        title="Technical Data Sheets"
        subtitle="Manage the rubber compound data sheets shown on the AU Industries website"
        actions={
          <>
            <Link
              href="/admin/portal/marketing/au"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ← Back to pages
            </Link>
            <a
              href="/au-industries/technical-data-sheets"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              View Live Page
            </a>
            <button
              type="button"
              onClick={async () => {
                await autoSaveCurrent();
                setSelectedId("new");
                setDefaultApplied(true);
              }}
              className="inline-flex items-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Data Sheet
            </button>
          </>
        }
      />

      <div className="sticky top-[57px] z-[5] -mx-6 overflow-x-auto border-b border-gray-200 bg-gray-50 px-6 py-2">
        <div className="flex gap-1">
          {sorted.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => switchToSheet(sheet.id)}
              className={
                activeId === sheet.id
                  ? "whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
                  : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
              }
            >
              {sheet.name}
            </button>
          ))}
          {activeId === "new" ? (
            <button
              type="button"
              onClick={() => switchToSheet("new")}
              className="whitespace-nowrap rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              New data sheet
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        {activeId ? (
          <DataSheetEditor
            ref={editorRef}
            key={activeId}
            sheetId={activeId}
            onCreated={(id) => setSelectedId(id)}
            onDeleted={(deletedId) => {
              const remaining = sorted.find((s) => s.id !== deletedId);
              setSelectedId(remaining ? remaining.id : "new");
            }}
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            canMoveLeft={canMoveLeft}
            canMoveRight={canMoveRight}
          />
        ) : null}
      </div>
    </div>
  );
}
