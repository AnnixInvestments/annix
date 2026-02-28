"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import {
  auRubberApiClient,
  type AuRubberPermissionDto,
  type AuRubberRoleDto,
  type AuRubberUserAccessDto,
  type CandidateImage,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../components/Breadcrumb";

const SOURCE_LABELS: Record<string, string> = {
  "logo-attr": "Logo element",
  "header-img": "Header image",
  "og-image": "Open Graph",
  favicon: "Favicon",
  "hero-selector": "Hero section",
  "bg-image": "Background",
  "large-img": "Large image",
  "section-img": "Section image",
  "srcset-img": "Srcset image",
  "wp-featured": "WP Featured",
};

function CandidateThumbnail({
  candidate,
  selected,
  onSelect,
  size,
}: {
  candidate: CandidateImage;
  selected: boolean;
  onSelect: () => void;
  size: "small" | "large";
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    const proxyUrl = auRubberApiClient.proxyImageUrl(candidate.url);
    const headers = auRubberApiClient.authHeaders();

    fetch(proxyUrl, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error("proxy failed");
        }
        return res.blob();
      })
      .then((blob) => {
        if (!revoked) {
          setObjectUrl(URL.createObjectURL(blob));
        }
      })
      .catch(() => {
        if (!revoked) {
          setFailed(true);
        }
      });

    return () => {
      revoked = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [candidate.url]);

  if (failed) {
    return null;
  }

  const heightClass = size === "small" ? "h-16" : "h-32";
  const label = SOURCE_LABELS[candidate.source] || candidate.source;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col items-center rounded-lg border-2 p-1.5 transition-all hover:shadow-md ${
        selected
          ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500"
          : "border-gray-200 hover:border-yellow-300"
      }`}
    >
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={label}
          className={`${heightClass} w-full object-contain rounded`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`${heightClass} w-full flex items-center justify-center bg-gray-100 rounded`}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent" />
        </div>
      )}
      <span className="mt-1 text-[10px] text-gray-500 truncate w-full text-center">{label}</span>
      {selected && (
        <div className="absolute top-1 right-1">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

function BrandingTab() {
  const { showToast } = useToast();
  const { branding, setBranding, resetBranding, colors } = useAuRubberBranding();

  const [websiteUrl, setWebsiteUrl] = useState("https://auind.co.za/");
  const [brandingAuthorized, setBrandingAuthorized] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logoCandidates, setLogoCandidates] = useState<CandidateImage[]>([]);
  const [heroCandidates, setHeroCandidates] = useState<CandidateImage[]>([]);
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(branding.logoUrl);
  const [selectedHeroUrl, setSelectedHeroUrl] = useState<string | null>(branding.heroUrl);

  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const normalizeToHex = (color: string): string | null => {
    if (color.startsWith("#")) {
      return color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    }

    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `#${[r, g, b].map((c) => parseInt(c, 10).toString(16).padStart(2, "0")).join("")}`;
    }

    return null;
  };

  const lightenColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.4));

    return `#${[lighten(r), lighten(g), lighten(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  };

  const handleExtractBranding = async () => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }
    if (!isValidUrl(websiteUrl)) {
      setError("Please enter a valid website URL");
      return;
    }
    if (!brandingAuthorized) {
      setError("Please authorize AU Rubber to access the website for branding");
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      setLogoCandidates([]);
      setHeroCandidates([]);
      setSelectedLogoUrl(null);
      setSelectedHeroUrl(null);

      const normalizedUrl = websiteUrl.startsWith("http")
        ? websiteUrl.trim()
        : `https://${websiteUrl.trim()}`;

      const result = await auRubberApiClient.scrapeBranding(normalizedUrl);

      if (
        result.logoCandidates.length === 0 &&
        result.heroCandidates.length === 0 &&
        !result.primaryColor
      ) {
        setError(
          "Could not extract branding from this website. You can set colors manually below.",
        );
      } else {
        setLogoCandidates(result.logoCandidates);
        setHeroCandidates(result.heroCandidates);

        if (result.logoCandidates.length > 0) {
          setSelectedLogoUrl(result.logoCandidates[0].url);
        }
        if (result.heroCandidates.length > 0) {
          setSelectedHeroUrl(result.heroCandidates[0].url);
        }
        if (result.primaryColor) {
          const normalized = normalizeToHex(result.primaryColor);
          if (normalized) {
            setPrimaryColor(normalized);
            setAccentColor(lightenColor(normalized));
          }
        }

        showToast("Branding extracted successfully", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to extract branding";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyBranding = () => {
    setBranding({
      primaryColor: primaryColor.trim(),
      accentColor: accentColor.trim(),
      logoUrl: selectedLogoUrl,
      heroUrl: selectedHeroUrl,
    });
    showToast("Branding applied successfully", "success");
  };

  const handleResetBranding = () => {
    resetBranding();
    setPrimaryColor("#323288");
    setAccentColor("#FFD700");
    setSelectedLogoUrl(null);
    setSelectedHeroUrl(null);
    showToast("Branding reset to defaults", "success");
  };

  const ColorSwatch = ({ color, label }: { color: string; label?: string }) => (
    <div className="flex items-center space-x-2">
      <div
        className="w-8 h-8 rounded border border-gray-300 shadow-sm"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="text-sm font-mono text-gray-600">{label || color}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Brand Extraction</h2>
        <p className="text-sm text-gray-600 mb-4">
          Extract branding colors, logos, and hero images from a website.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={brandingAuthorized}
              onChange={(e) => {
                setBrandingAuthorized(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">
              I authorize AU Rubber to access this website to extract branding elements
            </span>
          </label>

          <button
            onClick={handleExtractBranding}
            disabled={isExtracting || !brandingAuthorized || !websiteUrl.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExtracting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Extracting branding...
              </>
            ) : logoCandidates.length > 0 || heroCandidates.length > 0 ? (
              "Re-extract Branding"
            ) : (
              "Extract Branding"
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {logoCandidates.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Logo Candidates ({logoCandidates.length})
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {logoCandidates.map((candidate) => (
              <CandidateThumbnail
                key={candidate.url}
                candidate={candidate}
                selected={selectedLogoUrl === candidate.url}
                onSelect={() => setSelectedLogoUrl(candidate.url)}
                size="small"
              />
            ))}
          </div>
        </div>
      )}

      {heroCandidates.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Hero Image Candidates ({heroCandidates.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {heroCandidates.map((candidate) => (
              <CandidateThumbnail
                key={candidate.url}
                candidate={candidate}
                selected={selectedHeroUrl === candidate.url}
                onSelect={() => setSelectedHeroUrl(candidate.url)}
                size="large"
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700">
              Accent Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="accentColor"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex gap-3">
          <button
            onClick={handleApplyBranding}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Apply Branding
          </button>
          <button
            onClick={handleResetBranding}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Branding</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Background</h3>
            <ColorSwatch color={colors.background} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Accent</h3>
            <ColorSwatch color={colors.accent} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Sidebar</h3>
            <ColorSwatch color={colors.sidebar} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Text</h3>
            <ColorSwatch color={colors.sidebarText} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessControlTab() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AuRubberUserAccessDto[]>([]);
  const [roles, setRoles] = useState<AuRubberRoleDto[]>([]);
  const [permissions, setPermissions] = useState<AuRubberPermissionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingRole, setEditingRole] = useState<AuRubberRoleDto | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const [editingUserAccess, setEditingUserAccess] = useState<AuRubberUserAccessDto | null>(null);
  const [editUserRole, setEditUserRole] = useState("");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersData, rolesData, permissionsData] = await Promise.all([
        auRubberApiClient.accessUsers(),
        auRubberApiClient.accessRoles(),
        auRubberApiClient.accessPermissions(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (err) {
      showToast("Failed to load access control data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const permissionsByCategory = permissions.reduce(
    (acc, perm) => {
      const category = perm.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    },
    {} as Record<string, AuRubberPermissionDto[]>,
  );

  const handleEditRole = (role: AuRubberRoleDto) => {
    setEditingRole(role);
    setEditingRolePermissions([...role.permissions]);
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;

    try {
      await auRubberApiClient.setRolePermissions(editingRole.id, editingRolePermissions);
      showToast("Role permissions updated", "success");
      setEditingRole(null);
      loadData();
    } catch (err) {
      showToast("Failed to update role permissions", "error");
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await auRubberApiClient.deleteRole(roleId);
      showToast("Role deleted", "success");
      loadData();
    } catch (err) {
      showToast("Failed to delete role", "error");
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleCode.trim() || !newRoleName.trim()) {
      showToast("Please fill in code and name", "error");
      return;
    }

    try {
      await auRubberApiClient.createRole({
        code: newRoleCode.toLowerCase().replace(/\s+/g, "-"),
        name: newRoleName,
        description: newRoleDescription || undefined,
      });
      showToast("Role created", "success");
      setShowNewRoleModal(false);
      setNewRoleCode("");
      setNewRoleName("");
      setNewRoleDescription("");
      loadData();
    } catch (err) {
      showToast("Failed to create role", "error");
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteRole) {
      showToast("Please fill in email and select a role", "error");
      return;
    }

    try {
      await auRubberApiClient.inviteUser({
        email: inviteEmail,
        firstName: inviteFirstName || undefined,
        lastName: inviteLastName || undefined,
        roleCode: inviteRole,
      });
      showToast("User invited successfully", "success");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteRole("");
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to invite user";
      showToast(message, "error");
    }
  };

  const handleEditUserAccess = (user: AuRubberUserAccessDto) => {
    setEditingUserAccess(user);
    setEditUserRole(user.roleCode || "");
  };

  const handleSaveUserAccess = async () => {
    if (!editingUserAccess || !editUserRole) return;

    try {
      await auRubberApiClient.updateUserAccess(editingUserAccess.id, editUserRole);
      showToast("User role updated", "success");
      setEditingUserAccess(null);
      loadData();
    } catch (err) {
      showToast("Failed to update user role", "error");
    }
  };

  const handleRevokeAccess = async (accessId: number) => {
    if (!confirm("Are you sure you want to revoke this user's access?")) return;

    try {
      await auRubberApiClient.revokeUserAccess(accessId);
      showToast("Access revoked", "success");
      loadData();
    } catch (err) {
      showToast("Failed to revoke access", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Users</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Invite User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {user.firstName || user.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      {user.roleName || "No Role"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEditUserAccess(user)}
                      className="text-yellow-600 hover:text-yellow-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRevokeAccess(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No users with access yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Roles</h2>
          <button
            onClick={() => setShowNewRoleModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Add Role
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Permissions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Users
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.permissions.length}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.userCount}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {role.isDefault ? (
                      <span className="text-gray-400 text-xs">(Default role)</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditRole(role)}
                          className="text-yellow-600 hover:text-yellow-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit Role: {editingRole.name}</h3>
              <button
                onClick={() => setEditingRole(null)}
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
            <div className="px-6 py-4 space-y-4">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <label key={perm.code} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingRolePermissions.includes(perm.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRolePermissions([...editingRolePermissions, perm.code]);
                            } else {
                              setEditingRolePermissions(
                                editingRolePermissions.filter((p) => p !== perm.code),
                              );
                            }
                          }}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600">{perm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRolePermissions}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
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
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Add New Role</h3>
              <button
                onClick={() => setShowNewRoleModal(false)}
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
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g., supervisor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Supervisor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowNewRoleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUserAccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit User Role</h3>
              <button
                onClick={() => setEditingUserAccess(null)}
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
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Editing role for: <strong>{editingUserAccess.email}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setEditingUserAccess(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserAccess}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type TabType = "branding" | "access";

export default function SettingsPage() {
  const { hasPermission, isLoading: authLoading } = useAuRubberAuth();
  const [activeTab, setActiveTab] = useState<TabType>("branding");

  const canManageAccess = !authLoading && hasPermission("settings:manage");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Settings" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure AU Rubber app branding and preferences
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("branding")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "branding"
                ? "border-yellow-500 text-yellow-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Branding
          </button>
          {canManageAccess && (
            <button
              onClick={() => setActiveTab("access")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "access"
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Access Control
            </button>
          )}
        </nav>
      </div>

      {activeTab === "branding" && <BrandingTab />}
      {activeTab === "access" && canManageAccess && <AccessControlTab />}
    </div>
  );
}
