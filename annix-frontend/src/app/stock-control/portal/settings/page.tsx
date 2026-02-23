"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PasskeyManagementSection } from "@/app/components/PasskeyManagementSection";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { stockControlTokenStore } from "@/app/lib/api/portalTokenStores";
import type { StockControlLocation } from "@/app/lib/api/stockControlApi";
import {
  useCompanyRoles,
  useInvalidateCompanyRoles,
  useSettingsTeamMembers,
} from "@/app/lib/query/hooks";
import { DepartmentsLocationsSection } from "./DepartmentsLocationsSection";
import { InboundEmailConfigSection } from "./InboundEmailConfigSection";
import { PermissionsSection } from "./PermissionsSection";
import { SupplierMappingsSection } from "./SupplierMappingsSection";
import { TeamManagementSection } from "./TeamManagementSection";
import { WorkflowConfigurationSection } from "./WorkflowConfigurationSection";
import { WorkflowPreviewSection } from "./WorkflowPreviewSection";

export default function StockControlSettingsPage() {
  const router = useRouter();
  const { user, profile } = useStockControlAuth();

  const isAdmin = user?.role === "admin";
  const { data: companyRoles = [], isLoading: companyRolesLoading } = useCompanyRoles();
  const invalidateCompanyRoles = useInvalidateCompanyRoles();
  const { data: teamMembers = [] } = useSettingsTeamMembers();
  const [locations, setLocations] = useState<StockControlLocation[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/stock-control/portal/dashboard");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <h1 className="text-2xl font-bold text-gray-900 lg:col-span-2">Settings</h1>

      <div className="lg:col-span-2">
        <PasskeyManagementSection
          authHeaders={stockControlTokenStore.authHeaders()}
          title="Your passkeys"
        />
      </div>

      <PermissionsSection
        roles={companyRoles}
        rolesLoading={companyRolesLoading}
        onRolesChanged={invalidateCompanyRoles}
      />

      <TeamManagementSection companyRoles={companyRoles} locations={locations} />

      <DepartmentsLocationsSection onLocationsLoaded={setLocations} />

      {profile?.workflowEnabled === true && (
        <div className="lg:col-span-2 space-y-6">
          <WorkflowConfigurationSection teamMembers={teamMembers} />
          <WorkflowPreviewSection />
        </div>

        {brandingSelection === "custom" && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                Your website URL
              </label>
              <input
                id="websiteUrl"
                type="url"
                placeholder="https://yourcompany.com"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setBrandingError("");
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={brandingAuthorized}
                onChange={(e) => {
                  setBrandingAuthorized(e.target.checked);
                  setBrandingError("");
                }}
                className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">
                I authorize ASCA to access my website to extract branding elements (logo, colors)
                for use within this application
              </span>
            </label>
            <button
              type="button"
              onClick={handleExtractBranding}
              disabled={scraping || !brandingAuthorized || !websiteUrl.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scraping ? (
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

            {logoCandidates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Logo Candidates ({logoCandidates.length})
                </h3>
                <div className="grid grid-cols-4 gap-2">
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
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Hero Image Candidates ({heroCandidates.length})
                </h3>
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

            {processedLogoUrl && logoCandidates.length === 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <img
                  src={processedLogoUrl}
                  alt="Current logo"
                  className="h-12 w-12 object-contain rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Current logo</p>
                  <p className="text-xs text-gray-500">
                    Extract branding to choose a different logo
                  </p>
                </div>
              </div>
            )}

            {processedHeroUrl && heroCandidates.length === 0 && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Current hero image</p>
                <div className="relative rounded overflow-hidden" style={{ maxHeight: 160 }}>
                  <img
                    src={processedHeroUrl}
                    alt="Current hero"
                    className="w-full object-cover rounded"
                    style={{ maxHeight: 160 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Extract branding to choose a different image
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                  Primary Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="primaryColor"
                    type="color"
                    value={primaryColor || "#0d9488"}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor || "#0d9488"}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
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
                    value={accentColor || "#2dd4bf"}
                    onChange={(e) => {
                      setAccentColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor || "#2dd4bf"}
                    onChange={(e) => {
                      setAccentColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {brandingError && <p className="mt-3 text-sm text-red-600">{brandingError}</p>}
        {brandingSuccess && (
          <p className="mt-3 text-sm text-green-600">Branding preference saved successfully.</p>
        )}

        <button
          type="button"
          onClick={handleSaveBranding}
          disabled={brandingSaving || processing}
          className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {savingLabel()}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
          <button
            type="button"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
          >
            Invite Member
          </button>
        </div>

        {showInviteForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="storeman">Storeman</option>
                <option value="accounts">Accounts</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviteSending}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {inviteSending ? "Sending..." : "Send"}
              </button>
            </div>
            {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
          </div>
        )}

        {teamLoading ? (
          <div className="text-center py-8 text-gray-500">Loading team...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100">
                      <td className="py-3 px-2 text-sm text-gray-900">{member.name}</td>
                      <td className="py-3 px-2 text-sm text-gray-500">{member.email}</td>
                      <td className="py-3 px-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="storeman">Storeman</option>
                          <option value="accounts">Accounts</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {new Date(member.createdAt).toLocaleDateString("en-ZA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invitations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</h3>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div>
                        <span className="text-sm text-gray-900">{inv.email}</span>
                        <span className="ml-2 text-xs text-gray-500">({roleLabel(inv.role)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv.id)}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
