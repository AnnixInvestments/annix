"use client";

import { keys } from "es-toolkit/compat";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import type { AsteriskAllocation, AsteriskItem } from "@/app/lib/api/stock-control-api/types";
import { useModalAccessibility } from "../lib/useModalAccessibility";

interface AllocationRow {
  jtNumber: string;
  quantity: string;
}

interface ItemAllocationState {
  cpoItemId: number;
  rows: AllocationRow[];
}

interface AsteriskAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (allocations: AsteriskAllocation[]) => void;
  asteriskItems: AsteriskItem[];
  autoJtCount: number;
  autoJtNumbers: string[];
  submitting: boolean;
}

const EMPTY_ROW: AllocationRow = { jtNumber: "", quantity: "" };

export function AsteriskAllocationModal(props: AsteriskAllocationModalProps) {
  const { isOpen, onClose, onConfirm, asteriskItems, autoJtCount, autoJtNumbers, submitting } =
    props;

  const [itemStates, setItemStates] = useState<ItemAllocationState[]>(() =>
    asteriskItems.map((item) => ({
      cpoItemId: item.cpoItemId,
      rows: [{ ...EMPTY_ROW }],
    })),
  );

  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleRowChange = useCallback(
    (itemIdx: number, rowIdx: number, field: keyof AllocationRow, value: string) => {
      setItemStates((prev) =>
        prev.map((item, i) => {
          if (i !== itemIdx) return item;
          return {
            ...item,
            rows: item.rows.map((row, j) => (j === rowIdx ? { ...row, [field]: value } : row)),
          };
        }),
      );
      setErrors((prev) => {
        const next = { ...prev };
        delete next[itemIdx];
        return next;
      });
    },
    [],
  );

  const addRow = useCallback((itemIdx: number) => {
    setItemStates((prev) =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        return { ...item, rows: [...item.rows, { ...EMPTY_ROW }] };
      }),
    );
  }, []);

  const removeRow = useCallback((itemIdx: number, rowIdx: number) => {
    setItemStates((prev) =>
      prev.map((item, i) => {
        if (i !== itemIdx) return item;
        const newRows = item.rows.filter((_, j) => j !== rowIdx);
        return { ...item, rows: newRows.length === 0 ? [{ ...EMPTY_ROW }] : newRows };
      }),
    );
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<number, string> = {};

    asteriskItems.forEach((asterisk, idx) => {
      const state = itemStates[idx];
      if (!state) return;

      const filledRows = state.rows.filter((r) => r.jtNumber.trim() || r.quantity.trim());

      const totalAllocated = filledRows.reduce((sum, r) => {
        const qty = parseFloat(r.quantity);
        return sum + (Number.isNaN(qty) ? 0 : qty);
      }, 0);

      if (totalAllocated > asterisk.asteriskQtyInFile) {
        newErrors[idx] =
          `Total allocated (${totalAllocated}) exceeds asterisk quantity (${asterisk.asteriskQtyInFile})`;
      }

      filledRows.forEach((r) => {
        if (r.jtNumber.trim() && !r.quantity.trim()) {
          newErrors[idx] = "Each JT number must have a quantity";
        }
        if (r.quantity.trim() && !r.jtNumber.trim()) {
          newErrors[idx] = "Each quantity must have a JT number";
        }
        const qty = parseFloat(r.quantity);
        if (r.quantity.trim() && (Number.isNaN(qty) || qty <= 0)) {
          newErrors[idx] = "Quantity must be a positive number";
        }
      });
    });

    setErrors(newErrors);
    return keys(newErrors).length === 0;
  }, [asteriskItems, itemStates]);

  const handleConfirm = useCallback(() => {
    if (!validate()) return;

    const allocations: AsteriskAllocation[] = itemStates.map((state) => ({
      cpoItemId: state.cpoItemId,
      allocations: state.rows
        .filter((r) => r.jtNumber.trim() && r.quantity.trim())
        .map((r) => ({
          jtNumber: r.jtNumber.trim().toUpperCase(),
          quantity: parseFloat(r.quantity),
        })),
    }));

    onConfirm(allocations);
  }, [itemStates, validate, onConfirm]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      onClose();
    }
  }, [onClose, submitting]);

  const modalFocusRef = useModalAccessibility(isOpen, handleClose);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asterisk-allocation-modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2
                id="asterisk-allocation-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Allocate Deliveries
              </h2>
              {autoJtCount > 0 && (
                <p className="text-sm text-green-600 mt-0.5">
                  {autoJtCount} JT{autoJtCount === 1 ? "" : "s"} will be auto-created:{" "}
                  {autoJtNumbers.join(", ")}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">
                The items below were marked with *** in the Sage dump. Allocate JT numbers and
                quantities for any new deliveries, or leave blank if nothing new has arrived.
              </p>
            </div>
            <button
              ref={modalFocusRef as React.RefObject<HTMLButtonElement>}
              aria-label="Close"
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
            {asteriskItems.map((item, itemIdx) => {
              const state = itemStates[itemIdx];
              if (!state) return null;

              const totalAllocated = state.rows.reduce((sum, r) => {
                const qty = parseFloat(r.quantity);
                return sum + (Number.isNaN(qty) ? 0 : qty);
              }, 0);

              return (
                <div
                  key={item.cpoItemId}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {item.itemCode}
                        </span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {item.itemDescription}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Item No: {item.itemNo}</p>
                    </div>
                    <div className="flex-shrink-0 text-right text-sm">
                      <div className="text-gray-500">
                        Ordered:{" "}
                        <span className="font-medium text-gray-900">{item.totalCpoQty}</span>
                      </div>
                      <div className="text-gray-500">
                        Delivered:{" "}
                        <span className="font-medium text-green-600">
                          {item.alreadyDeliveredQty}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        Remaining:{" "}
                        <span className="font-medium text-amber-600">{item.remainingQty}</span>
                      </div>
                      {totalAllocated > 0 && (
                        <div className="text-gray-500 mt-1">
                          Allocating:{" "}
                          <span
                            className={`font-medium ${totalAllocated > item.remainingQty ? "text-red-600" : "text-blue-600"}`}
                          >
                            {totalAllocated}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {state.rows.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="JT number (e.g. JT80291)"
                          value={row.jtNumber}
                          onChange={(e) =>
                            handleRowChange(itemIdx, rowIdx, "jtNumber", e.target.value)
                          }
                          disabled={submitting}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) =>
                            handleRowChange(itemIdx, rowIdx, "quantity", e.target.value)
                          }
                          min="0"
                          max={item.remainingQty}
                          disabled={submitting}
                          className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        {state.rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(itemIdx, rowIdx)}
                            disabled={submitting}
                            className="text-gray-400 hover:text-red-500 p-1"
                            aria-label="Remove allocation row"
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
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addRow(itemIdx)}
                    disabled={submitting}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
                  >
                    + Add another JT
                  </button>

                  {errors[itemIdx] && <p className="text-sm text-red-600">{errors[itemIdx]}</p>}
                </div>
              );
            })}

            {asteriskItems.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No items require allocation.</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Leave all fields blank for items with no new deliveries
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {submitting ? "Creating Job Cards..." : "Confirm Allocations"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
