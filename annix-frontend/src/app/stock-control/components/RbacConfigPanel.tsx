"use client";

import { useCallback, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { ALL_NAV_ITEMS, ALL_ROLES } from "../config/navItems";
import { useStockControlRbac } from "../context/StockControlRbacContext";

interface RbacConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RbacConfigPanel({ isOpen, onClose }: RbacConfigPanelProps) {
  const { rbacConfig, reloadRbacConfig } = useStockControlRbac();
  const [localConfig, setLocalConfig] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(
        Object.entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, roles]) => {
          acc[key] = [...roles];
          return acc;
        }, {}),
      );
    }
  }, [isOpen, rbacConfig]);

  const handleToggle = useCallback((navKey: string, role: string) => {
    setLocalConfig((prev) => {
      const current = prev[navKey] ?? [];
      const has = current.includes(role);
      return {
        ...prev,
        [navKey]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await stockControlApiClient.updateNavRbacConfig(localConfig);
      await reloadRbacConfig();
      onClose();
    } catch {
      setSaving(false);
    }
  }, [localConfig, reloadRbacConfig, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu Visibility by Role</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 pr-2">
                  Menu Item
                </th>
                {ALL_ROLES.map((role) => (
                  <th
                    key={role}
                    className="text-center text-xs font-medium text-gray-500 uppercase pb-3 px-2"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_NAV_ITEMS.map((item) => {
                const roles = localConfig[item.key] ?? item.defaultRoles;
                return (
                  <tr key={item.key} className="border-b border-gray-100">
                    <td className="py-3 pr-2 text-sm text-gray-700">{item.label}</td>
                    {ALL_ROLES.map((role) => {
                      const checked = roles.includes(role);
                      const disabled = role === "admin" || item.immutable === true;
                      return (
                        <td key={role} className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => handleToggle(item.key, role)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-500">
            Admin always has full access. Settings is always admin-only.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
