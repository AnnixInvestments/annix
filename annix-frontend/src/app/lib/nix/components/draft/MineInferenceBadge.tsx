"use client";

import { useEffect, useMemo, useState } from "react";
import type { NixExtractionSummary } from "@/app/lib/query/hooks";
import {
  useClearExtractionMine,
  useMineLibraryMines,
  useRetagExtractionMine,
} from "@/app/lib/query/hooks";
import { CreateMineModal } from "../library/CreateMineModal";

interface MineInferenceBadgeProps {
  extraction: NixExtractionSummary;
  onChanged?: () => void;
}

export function MineInferenceBadge(props: MineInferenceBadgeProps) {
  const { extraction, onChanged } = props;
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const minesQuery = useMineLibraryMines(searchQuery.trim().length === 0 ? undefined : searchQuery);
  const retagMutation = useRetagExtractionMine();
  const clearMutation = useClearExtractionMine();
  const minesData = minesQuery.data;
  const minesList = minesData ? minesData : [];

  const confidence = extraction.mineInferenceConfidence;
  const reason = extraction.mineInferenceReason;
  const hasMine = Boolean(extraction.mineId);

  useEffect(() => {
    if (!isPickerOpen) {
      setSearchQuery("");
    }
  }, [isPickerOpen]);

  const mineNameValue = extraction.mineName;
  const mineIdValue = extraction.mineId;
  const inferenceLabel = useMemo(() => {
    if (!hasMine) return null;
    const name = mineNameValue ? mineNameValue : `Mine #${mineIdValue}`;
    return name;
  }, [hasMine, mineNameValue, mineIdValue]);

  const confidencePercent =
    confidence !== null && confidence !== undefined ? Math.round(confidence * 100) : null;

  const onPick = async (mineId: number) => {
    await retagMutation.mutateAsync({ extractionId: extraction.id, mineId });
    setPickerOpen(false);
    onChanged?.();
  };

  const onClear = async () => {
    await clearMutation.mutateAsync(extraction.id);
    onChanged?.();
  };

  const onMineCreated = () => {
    setCreateOpen(false);
    onChanged?.();
  };

  if (!hasMine) {
    return (
      <>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            ⛏ No mine inferred
          </span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-amber-700 hover:text-amber-900 underline"
          >
            tag a mine
          </button>
          <span className="text-gray-300">·</span>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="text-amber-700 hover:text-amber-900 underline"
          >
            create new mine
          </button>
        </div>
        {isPickerOpen ? (
          <MinePicker
            extractionId={extraction.id}
            mines={minesList}
            isLoading={minesQuery.isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onPick={onPick}
            onClose={() => setPickerOpen(false)}
            onCreateNew={() => {
              setPickerOpen(false);
              setCreateOpen(true);
            }}
            isPending={retagMutation.isPending}
          />
        ) : null}
        {isCreateOpen ? (
          <CreateMineModal
            seedFromExtraction={extraction}
            onCreated={onMineCreated}
            onClose={() => setCreateOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          ⛏ Tagged: <span className="font-semibold ml-1">{inferenceLabel}</span>
          {confidencePercent !== null ? (
            <span className="ml-1 text-emerald-700">({confidencePercent}%)</span>
          ) : null}
        </span>
        {reason ? (
          <span className="text-gray-500" title={reason}>
            via {humaniseReason(reason)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          change
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={clearMutation.isPending}
          className="text-gray-500 hover:text-gray-700 underline disabled:opacity-40"
        >
          clear
        </button>
      </div>
      {isPickerOpen ? (
        <MinePicker
          extractionId={extraction.id}
          mines={minesList}
          isLoading={minesQuery.isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onPick={onPick}
          onClose={() => setPickerOpen(false)}
          onCreateNew={() => {
            setPickerOpen(false);
            setCreateOpen(true);
          }}
          isPending={retagMutation.isPending}
        />
      ) : null}
      {isCreateOpen ? (
        <CreateMineModal
          seedFromExtraction={extraction}
          onCreated={onMineCreated}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </>
  );
}

function MinePicker(props: {
  extractionId: number;
  mines: Array<{ id: number; mineName: string; operatingCompany: string; province: string }>;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPick: (mineId: number) => Promise<void>;
  onClose: () => void;
  onCreateNew: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mt-16 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Pick a mine</h3>
          <button
            type="button"
            onClick={props.onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <input
          type="text"
          value={props.searchQuery}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Search by mine name or operating company…"
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          autoFocus
        />
        <div className="max-h-72 overflow-y-auto border border-gray-100 rounded">
          {props.isLoading ? (
            <p className="p-3 text-xs text-gray-500">Loading…</p>
          ) : props.mines.length === 0 ? (
            <p className="p-3 text-xs text-gray-500">
              No mines found. Try a different search, or create a new mine.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {props.mines.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => void props.onPick(m.id)}
                    disabled={props.isPending}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <span className="text-sm font-medium text-gray-900">{m.mineName}</span>
                    <span className="ml-2 text-xs text-gray-500">{m.operatingCompany}</span>
                    <span className="ml-2 text-xs text-gray-400">{m.province}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={props.onCreateNew}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            + Create new mine instead
          </button>
          <button
            type="button"
            onClick={props.onClose}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const humaniseReason = (reason: string): string => {
  const map: Record<string, string> = {
    name_in_project: "project name match",
    name_in_customer: "customer name match",
    name_in_title: "document title match",
    operating_company_in_customer: "operating company match",
    word_set_overlap: "word-set overlap",
    docnumber_prefix: "doc-number prefix",
    manual_override: "manual override",
    manual_create_from_extraction: "manual (created from this extraction)",
    manual_clear: "manually cleared",
  };
  const mapped = map[reason];
  return mapped ? mapped : reason;
};
