"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { IssuableProductDto } from "../types/products";

interface PaintRow {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
  packSizeLitres: number | null;
  componentGroupKey: string | null;
  componentRole: string | null;
  numberOfParts: number | null;
  mixingRatio: string | null;
}

function toPaintRow(p: IssuableProductDto): PaintRow | null {
  const paint = p.paint;
  if (!paint) return null;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    quantity: p.quantity,
    unitOfMeasure: p.unitOfMeasure,
    packSizeLitres: paint.packSizeLitres,
    componentGroupKey: paint.componentGroupKey,
    componentRole: paint.componentRole,
    numberOfParts: paint.numberOfParts,
    mixingRatio: paint.mixingRatio,
  };
}

export function AdminPaintPackSizesPage() {
  const config = useStockManagementConfig();
  const clientRef = useRef(
    new StockManagementApiClient({
      baseUrl: config.apiBaseUrl,
      headers: config.authHeaders,
    }),
  );

  const [rows, setRows] = useState<PaintRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMissing, setFilterMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPackSize, setEditPackSize] = useState("");
  const [editGroupKey, setEditGroupKey] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      let page = 1;
      const all: PaintRow[] = [];
      let hasMore = true;
      // eslint-disable-next-line no-restricted-syntax -- sequential paginated fetch, each page depends on prior
      while (hasMore) {
        const result = await clientRef.current.listProducts({
          productType: "paint",
          active: true,
          page,
          pageSize: 100,
        });
        const mapped = result.items.map(toPaintRow).filter((r): r is PaintRow => r !== null);
        all.push(...mapped);
        hasMore = result.items.length === 100;
        page++;
      }
      setRows(all);
    } catch (err) {
      console.error("Failed to load paint products", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    let result = rows;
    if (filterMissing) {
      result = result.filter((r) => r.packSizeLitres == null);
    }
    const trimmed = search.trim().toLowerCase();
    if (trimmed !== "") {
      result = result.filter((r) => {
        const name = r.name.toLowerCase();
        const sku = r.sku.toLowerCase();
        return name.includes(trimmed) || sku.includes(trimmed);
      });
    }
    return result;
  }, [rows, filterMissing, search]);

  const missingCount = useMemo(() => rows.filter((r) => r.packSizeLitres == null).length, [rows]);

  const startEdit = (row: PaintRow) => {
    setEditingId(row.id);
    const ps = row.packSizeLitres;
    setEditPackSize(ps == null ? "" : String(ps));
    const gk = row.componentGroupKey;
    setEditGroupKey(gk == null ? "" : gk);
    const cr = row.componentRole;
    setEditRole(cr == null ? "" : cr);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPackSize("");
    setEditGroupKey("");
    setEditRole("");
  };

  const saveEdit = async (rowId: number) => {
    setSaving(true);
    try {
      const packVal = editPackSize.trim() === "" ? null : parseFloat(editPackSize);
      const groupVal = editGroupKey.trim() === "" ? null : editGroupKey.trim();
      const roleVal = editRole.trim() === "" ? null : editRole.trim();
      await clientRef.current.updateProduct(rowId, {
        paint: {
          packSizeLitres: packVal,
          componentGroupKey: groupVal,
          componentRole: roleVal,
        },
      });
      setRows(
        rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                packSizeLitres: packVal,
                componentGroupKey: groupVal,
                componentRole: roleVal,
              }
            : r,
        ),
      );
      cancelEdit();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading paint products...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Paint Pack Sizes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage pack sizes and component grouping for paint products.
          {missingCount > 0 ? (
            <span className="ml-2 text-amber-700 font-medium">
              {missingCount} product{missingCount === 1 ? "" : "s"} missing pack size
            </span>
          ) : null}
        </p>
      </header>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-700 whitespace-nowrap">
          <input
            type="checkbox"
            checked={filterMissing}
            onChange={(e) => setFilterMissing(e.target.checked)}
            className="rounded border-gray-300"
          />
          Missing only
        </label>
        <span className="text-xs text-gray-500">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                SKU
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                Stock
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                Pack Size (L)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Component Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Mix Ratio
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((row) => {
              const isEditing = editingId === row.id;
              const packDisplay = row.packSizeLitres;
              const groupDisplay = row.componentGroupKey;
              const roleDisplay = row.componentRole;
              const ratioDisplay = row.mixingRatio;
              return (
                <tr key={row.id} className={packDisplay == null ? "bg-amber-50" : ""}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.sku}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {row.quantity} {row.unitOfMeasure}
                  </td>
                  {isEditing ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editPackSize}
                          onChange={(e) => setEditPackSize(e.target.value)}
                          placeholder="e.g. 4"
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editGroupKey}
                          onChange={(e) => setEditGroupKey(e.target.value)}
                          placeholder="e.g. PENGUARD-EXPRESS"
                          className="w-40 border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        >
                          <option value="">-</option>
                          <option value="base">Base (Part A)</option>
                          <option value="hardener">Hardener (Part B)</option>
                          <option value="thinner">Thinner</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {ratioDisplay == null ? "-" : ratioDisplay}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => saveEdit(row.id)}
                            disabled={saving}
                            className="text-xs text-teal-700 font-medium hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-right">
                        {packDisplay == null ? (
                          <span className="text-amber-600 text-xs">missing</span>
                        ) : (
                          <span className="font-mono">{packDisplay}L</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {groupDisplay == null ? "-" : groupDisplay}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {roleDisplay == null ? "-" : roleDisplay}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {ratioDisplay == null ? "-" : ratioDisplay}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-xs text-teal-700 font-medium hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                  {rows.length === 0 ? "No paint products found" : "No matches"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPaintPackSizesPage;
