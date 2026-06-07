"use client";

import { toPairs as entries } from "es-toolkit/compat";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/app/components/ui/DateInput";
import type { InviteUserDto, RbacApp, RbacAppDetail } from "@/app/lib/api/adminApi";

const ORBIT_APP_CODE = "annix-orbit";

// Orbit invites are provisioned per module → role/tier (not RBAC staff roles).
// Add a module's options here as each module's assignment flow is built.
const ORBIT_MODULES: { key: string; label: string; active: boolean }[] = [
  { key: "seeker", label: "Seeker", active: true },
  { key: "recruiter", label: "Recruiter", active: false },
  { key: "company", label: "Company", active: false },
  { key: "student", label: "Student", active: false },
  { key: "teacher-assistant", label: "Teacher Assistant", active: false },
];

// MatchTier keys (@annix/product-data/sa-market) → display names.
const SEEKER_TIERS: { value: string; label: string }[] = [
  { value: "soft", label: "Explorer" },
  { value: "medium", label: "Pathfinder" },
  { value: "hard", label: "Trailblazer" },
];

export interface OrbitInviteExtra {
  module: string;
  tier: string;
  permanent: boolean;
  trialDays: number;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: RbacApp[];
  selectedAppCode: string | null;
  onAppChange: (code: string) => void;
  appDetails: RbacAppDetail | null;
  onInvite: (dto: InviteUserDto, orbitExtra?: OrbitInviteExtra) => void;
  isInviting: boolean;
}

export function InviteUserModal(props: InviteUserModalProps) {
  const { isOpen, onClose, apps, selectedAppCode, onAppChange, appDetails, onInvite, isInviting } =
    props;
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [orbitModule, setOrbitModule] = useState("seeker");
  const [orbitTier, setOrbitTier] = useState("soft");
  const [permanent, setPermanent] = useState(true);
  const [trialDays, setTrialDays] = useState(30);

  useEffect(() => {
    if (isOpen && appDetails) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setUseCustomPermissions(false);
      const rawCode = appDetails.roles.find((r) => r.isDefault)?.code;
      setSelectedRoleCode(rawCode || null);
      setSelectedPermissions([]);
      setExpiresAt("");
      setOrbitModule("seeker");
      setOrbitTier("soft");
      setPermanent(true);
      setTrialDays(30);
    }
  }, [isOpen, appDetails]);

  if (!isOpen) return null;

  const isOrbit = selectedAppCode === ORBIT_APP_CODE;

  const permissionsByCategory: Record<string, RbacAppDetail["permissions"]> = appDetails
    ? appDetails.permissions.reduce(
        (acc, perm) => {
          const rawCategory = perm.category;
          const category = rawCategory ?? "General";
          if (!acc[category]) acc[category] = [];
          acc[category].push(perm);
          return acc;
        },
        {} as Record<string, RbacAppDetail["permissions"]>,
      )
    : {};

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  const handleInvite = () => {
    if (!email || !appDetails) return;

    const dto: InviteUserDto = {
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      appCode: appDetails.code,
      useCustomPermissions,
      roleCode: useCustomPermissions ? null : selectedRoleCode,
      permissionCodes: useCustomPermissions ? selectedPermissions : undefined,
      expiresAt: expiresAt || null,
    };
    if (isOrbit) {
      onInvite(dto, { module: orbitModule, tier: orbitTier, permanent, trialDays });
    } else {
      onInvite(dto);
    }
  };

  const rbacValid = !useCustomPermissions
    ? Boolean(selectedRoleCode)
    : selectedPermissions.length > 0;
  const orbitValid = orbitModule === "seeker" ? Boolean(orbitTier) : false;
  const isValid = Boolean(email) && Boolean(appDetails) && (isOrbit ? orbitValid : rbacValid);

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
            <p className="text-sm text-gray-500 mt-1">
              Send an invitation email and grant access to the selected app
            </p>
          </div>

          <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[60vh]">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application *</label>
              <select
                value={selectedAppCode ?? ""}
                onChange={(e) => onAppChange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select an application...</option>
                {apps.map((app) => (
                  <option key={app.code} value={app.code}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {isOrbit && appDetails && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module *</label>
                  <select
                    value={orbitModule}
                    onChange={(e) => setOrbitModule(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {ORBIT_MODULES.map((m) => (
                      <option key={m.key} value={m.key} disabled={!m.active}>
                        {m.label}
                        {m.active ? "" : " (coming soon)"}
                      </option>
                    ))}
                  </select>
                </div>

                {orbitModule === "seeker" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tier *</label>
                    <select
                      value={orbitTier}
                      onChange={(e) => setOrbitTier(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {SEEKER_TIERS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      The tier is applied automatically when the seeker uploads their CV.
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    This module's roles aren't available yet.
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={permanent}
                      onChange={(e) => setPermanent(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Permanent (no expiry)</span>
                  </label>
                  {!permanent && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-700">Trial days</label>
                      <input
                        type="number"
                        min={1}
                        value={trialDays}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setTrialDays(n > 0 ? n : 1);
                        }}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {!isOrbit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Access Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!useCustomPermissions}
                      onChange={() => setUseCustomPermissions(false)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Use a predefined role</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={useCustomPermissions}
                      onChange={() => setUseCustomPermissions(true)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Custom permissions</span>
                  </label>
                </div>
              </div>
            )}

            {selectedAppCode && !appDetails && (
              <div className="text-sm text-gray-500">Loading access options…</div>
            )}

            {!isOrbit && appDetails && !useCustomPermissions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={selectedRoleCode ?? ""}
                  onChange={(e) =>
                    setSelectedRoleCode(
                      (() => {
                        const rawValue = e.target.value;
                        return rawValue || null;
                      })(),
                    )
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select a role...</option>
                  {appDetails.roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                      {role.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
                {appDetails.roles.find((r) => r.code === selectedRoleCode)?.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {appDetails.roles.find((r) => r.code === selectedRoleCode)?.description}
                  </p>
                )}
              </div>
            )}

            {!isOrbit && appDetails && useCustomPermissions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions ({selectedPermissions.length} selected)
                </label>
                <div className="space-y-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <label key={perm.code} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.code)}
                              onChange={() => togglePermission(perm.code)}
                              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                            />
                            <div>
                              <span className="text-sm text-gray-900">{perm.name}</span>
                              {perm.description && (
                                <p className="text-xs text-gray-500">{perm.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date (optional)
              </label>
              <DateInput
                value={expiresAt ? expiresAt.split("T")[0] : ""}
                onChange={(value) => setExpiresAt(value ? `${value}T23:59:59Z` : "")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for permanent access</p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={isInviting || !isValid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInviting ? "Sending Invitation..." : "Send Invitation"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
