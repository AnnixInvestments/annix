"use client";

import { useState } from "react";
import { useMineLibraryMines } from "@/app/lib/query/hooks";

export interface MineLibraryIndexProps {
  basePath: string;
  title?: string;
  subtitle?: string;
}

export function MineLibraryIndex(props: MineLibraryIndexProps) {
  const { basePath, title, subtitle } = props;
  const [search, setSearch] = useState("");
  const minesQuery = useMineLibraryMines(search.trim().length > 0 ? search : undefined);

  const headerTitle = title || "Nix mine library";
  const headerSubtitle =
    subtitle ||
    "Specs and drawings filed under each mine. Auto-tagged by Nix on extraction; reused on every future quote that references the same doc number.";

  const errorObj = minesQuery.error;
  const errorMessage = errorObj ? errorObj.message : "";
  const minesData = minesQuery.data;
  const mines = minesData ? minesData : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{headerTitle}</h1>
        <p className="text-sm text-gray-600 mt-1">{headerSubtitle}</p>
      </header>

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by mine name or operating company…"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
      />

      {minesQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : minesQuery.isError ? (
        <p className="text-sm text-red-600">Couldn't load mines. {errorMessage}</p>
      ) : mines.length === 0 ? (
        <p className="text-sm text-gray-500">
          {search.trim()
            ? `No mines match "${search}".`
            : "No mines have extractions tagged to them yet. Upload a document via Nix and the mine library will start populating automatically."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 bg-white border border-gray-200 rounded">
          {mines.map((m) => (
            <li key={m.id}>
              <a
                href={`${basePath}/${m.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.mineName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {m.operatingCompany} · {m.province}
                  </p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-3">
                  {m.extractionCount} document{m.extractionCount === 1 ? "" : "s"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
