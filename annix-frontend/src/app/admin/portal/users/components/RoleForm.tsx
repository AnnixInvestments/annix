"use client";

import { useEffect, useState } from "react";
import type { RbacAppRole } from "@/app/lib/api/adminApi";

interface CreateRoleData {
  code: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface UpdateRoleData {
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface RoleFormProps {
  role: RbacAppRole | null;
  onSubmit: ((data: CreateRoleData) => void) | ((data: UpdateRoleData) => void);
  onCancel: () => void;
  isSubmitting: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function RoleForm({ role, onSubmit, onCancel, isSubmitting }: RoleFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [autoCode, setAutoCode] = useState(true);

  const isEditing = role !== null;

  useEffect(() => {
    if (role) {
      setCode(role.code);
      setName(role.name);
      setDescription(role.description ?? "");
      setIsDefault(role.isDefault);
      setAutoCode(false);
    } else {
      setCode("");
      setName("");
      setDescription("");
      setIsDefault(false);
      setAutoCode(true);
    }
  }, [role]);

  useEffect(() => {
    if (autoCode && !isEditing) {
      setCode(slugify(name));
    }
  }, [name, autoCode, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing) {
      (onSubmit as (data: UpdateRoleData) => void)({
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault,
      });
    } else {
      (onSubmit as (data: CreateRoleData) => void)({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault,
      });
    }
  };

  const isValid = name.trim().length >= 2 && (isEditing || code.trim().length >= 2);

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-4">
      <h4 className="font-medium text-gray-900 dark:text-white">
        {isEditing ? "Edit Role" : "Create New Role"}
      </h4>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Role Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sales Representative"
          className="block w-full rounded-md border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {!isEditing && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Role Code *
            </label>
            <label className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                checked={autoCode}
                onChange={(e) => setAutoCode(e.target.checked)}
                className="h-3 w-3 rounded text-blue-600 mr-1"
              />
              Auto-generate
            </label>
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setAutoCode(false);
            }}
            placeholder="e.g., sales-rep"
            className="block w-full rounded-md border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Unique identifier used internally. Cannot be changed after creation.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Can view and create RFQs but cannot approve"
          rows={2}
          className="block w-full rounded-md border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Set as default role for new users
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md hover:bg-gray-50 dark:hover:bg-slate-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update Role" : "Create Role"}
        </button>
      </div>
    </form>
  );
}
