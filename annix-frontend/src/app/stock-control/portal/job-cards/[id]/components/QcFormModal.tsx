"use client";

import type { ReactNode } from "react";

interface QcFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  saveDisabled?: boolean;
  maxWidth?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function QcFormModal(props: QcFormModalProps) {
  const maxWidth = props.maxWidth || "max-w-2xl";
  const saveDisabled = props.saveDisabled || false;

  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md p-4">
      <div
        className={`w-full ${maxWidth} rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
          {props.headerRight}
        </div>

        {props.error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{props.error}</div>
        )}

        {props.children}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.saving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.saving || saveDisabled}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {props.saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
