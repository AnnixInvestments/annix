"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/app/components/ui/DateInput";
import {
  adminApiClient,
  type InviteAppGrant,
  type InviteUserDto,
  type RbacApp,
  type RbacAppDetail,
  type RbacAppRole,
} from "@/app/lib/api/adminApi";

const ORBIT_APP_CODE = "annix-orbit";

const ORBIT_MODULES: { key: string; label: string; active: boolean }[] = [
  { key: "seeker", label: "Seeker", active: true },
  { key: "recruiter", label: "Recruiter", active: false },
  { key: "company", label: "Company", active: false },
  { key: "student", label: "Student", active: false },
  { key: "teacher-assistant", label: "Teacher Assistant", active: false },
];

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
  onInvite: (dto: InviteUserDto, orbitExtra?: OrbitInviteExtra) => void;
  isInviting: boolean;
}

export function InviteUserModal(props: InviteUserModalProps) {
  const { isOpen, onClose, apps, onInvite, isInviting } = props;
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [roleByApp, setRoleByApp] = useState<Record<string, string | null>>({});
  const [detailsByApp, setDetailsByApp] = useState<Record<string, RbacAppDetail>>({});
  const [loadingApps, setLoadingApps] = useState<Record<string, boolean>>({});
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [orbitModule, setOrbitModule] = useState("seeker");
  const [orbitTier, setOrbitTier] = useState("soft");
  const [permanent, setPermanent] = useState(true);
  const [trialDays, setTrialDays] = useState(30);

  if (!isOpen) return null;

  const loadRoles = (code: string) => {
    setLoadingApps((prev) => ({ ...prev, [code]: true }));
    adminApiClient
      .rbacAppDetails(code)
      .then((detail) => {
        setDetailsByApp((prev) => ({ ...prev, [code]: detail }));
        const defaultRole = detail.roles.find((r) => r.isDefault);
        const fallbackRole = defaultRole ?? detail.roles[0];
        const defaultCode = fallbackRole ? fallbackRole.code : null;
        setRoleByApp((prev) => {
          const existing = prev[code];
          return existing ? prev : { ...prev, [code]: defaultCode };
        });
      })
      .finally(() => setLoadingApps((prev) => ({ ...prev, [code]: false })));
  };

  const toggleApp = (code: string) => {
    const isEnabled = enabled[code] === true;
    setEnabled((prev) => ({ ...prev, [code]: !isEnabled }));
    const alreadyLoaded = detailsByApp[code] != null;
    if (!isEnabled && code !== ORBIT_APP_CODE && !alreadyLoaded) {
      loadRoles(code);
    }
  };

  const setRole = (code: string, roleCode: string) => {
    const nextRole = roleCode || null;
    setRoleByApp((prev) => ({ ...prev, [code]: nextRole }));
  };

  const enabledApps = apps.filter((app) => enabled[app.code] === true);
  const orbitEnabled = enabledApps.some((app) => app.code === ORBIT_APP_CODE);
  const nonOrbitEnabled = enabledApps.filter((app) => app.code !== ORBIT_APP_CODE);

  const everyNonOrbitHasRole = nonOrbitEnabled.every((app) => {
    const role = roleByApp[app.code];
    return Boolean(role);
  });
  const orbitValid = !orbitEnabled || (orbitModule === "seeker" ? Boolean(orbitTier) : false);
  const isValid = Boolean(email) && enabledApps.length > 0 && everyNonOrbitHasRole && orbitValid;

  const handleInvite = () => {
    if (!isValid) return;
    const expiry = expiresAt || null;
    const grants: InviteAppGrant[] = enabledApps.map((app) => {
      if (app.code === ORBIT_APP_CODE) {
        return { appCode: app.code, roleCode: null, expiresAt: expiry };
      }
      const role = roleByApp[app.code];
      return { appCode: app.code, roleCode: role ?? null, expiresAt: expiry };
    });
    const dto: InviteUserDto = {
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      apps: grants,
    };
    if (orbitEnabled) {
      onInvite(dto, { module: orbitModule, tier: orbitTier, permanent, trialDays });
    } else {
      onInvite(dto);
    }
  };

  const selectClass =
    "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
            <p className="text-sm text-gray-500 mt-1">
              Choose the apps this person should have, set their role on each, then send the
              invitation.
            </p>
          </div>

          <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[60vh]">
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
                  className={selectClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className={selectClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className={selectClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Apps *</label>
              <div className="space-y-2 border border-gray-200 rounded-md p-3">
                {apps.map((app) => {
                  const isAppEnabled = enabled[app.code] === true;
                  const isOrbitApp = app.code === ORBIT_APP_CODE;
                  const detail = detailsByApp[app.code];
                  const isLoading = loadingApps[app.code] === true;
                  const roles: RbacAppRole[] = detail ? detail.roles : [];
                  const currentRole = roleByApp[app.code];
                  const roleValue = currentRole ? currentRole : "";
                  return (
                    <div key={app.code} className="rounded-md">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isAppEnabled}
                          onChange={() => toggleApp(app.code)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-900">{app.name}</span>
                      </label>

                      {isAppEnabled && !isOrbitApp && (
                        <div className="mt-2 ml-6">
                          {isLoading ? (
                            <p className="text-sm text-gray-500">Loading roles…</p>
                          ) : (
                            <select
                              value={roleValue}
                              onChange={(e) => setRole(app.code, e.target.value)}
                              className={selectClass}
                            >
                              <option value="">Select a role...</option>
                              {roles.map((role) => (
                                <option key={role.code} value={role.code}>
                                  {role.name}
                                  {role.isDefault ? " (Default)" : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {isAppEnabled && isOrbitApp && (
                        <div className="mt-2 ml-6 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Module *
                            </label>
                            <select
                              value={orbitModule}
                              onChange={(e) => setOrbitModule(e.target.value)}
                              className={selectClass}
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tier *
                              </label>
                              <select
                                value={orbitTier}
                                onChange={(e) => setOrbitTier(e.target.value)}
                                className={selectClass}
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
                              <span className="ml-2 text-sm text-gray-700">
                                Permanent (no expiry)
                              </span>
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date (optional)
              </label>
              <DateInput
                value={expiresAt ? expiresAt.split("T")[0] : ""}
                onChange={(value) => setExpiresAt(value ? `${value}T23:59:59Z` : "")}
                className={selectClass}
              />
              <p className="mt-1 text-xs text-gray-500">
                Applies to every app granted. Leave empty for permanent access.
              </p>
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
