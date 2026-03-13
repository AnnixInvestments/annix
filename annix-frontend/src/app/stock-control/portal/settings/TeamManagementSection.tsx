"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CompanyRole,
  StockControlInvitation,
  StockControlTeamMember,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { isValidEmail } from "../../lib/validation";

interface TeamManagementSectionProps {
  companyRoles: CompanyRole[];
}

export function TeamManagementSection({ companyRoles }: TeamManagementSectionProps) {
  const [teamMembers, setTeamMembers] = useState<StockControlTeamMember[]>([]);
  const [invitations, setInvitations] = useState<StockControlInvitation[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("storeman");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [sendingAppLinkId, setSendingAppLinkId] = useState<number | null>(null);

  const assignableRoles = companyRoles.filter((r) => r.key !== "viewer");

  const localRoleLabel = (roleKey: string) => {
    const match = companyRoles.find((r) => r.key === roleKey);
    return match ? match.label : roleKey;
  };

  const loadTeamData = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [members, invites] = await Promise.all([
        stockControlApiClient.teamMembers(),
        stockControlApiClient.companyInvitations(),
      ]);
      setTeamMembers(members);
      setInvitations(invites);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to load team data");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const handleRoleChange = async (memberId: number, newRole: string) => {
    try {
      await stockControlApiClient.updateMemberRole(memberId, newRole);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update role";
      alert(msg);
    }
  };

  const handleSendAppLink = async (memberId: number) => {
    setSendingAppLinkId(memberId);
    try {
      await stockControlApiClient.sendAppLink(memberId);
      alert("App link sent successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send app link";
      alert(msg);
    } finally {
      setSendingAppLinkId(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("Please enter an email address.");
      return;
    }

    if (!isValidEmail(inviteEmail)) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    setInviteError("");
    setInviteSending(true);

    try {
      await stockControlApiClient.createInvitation(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("storeman");
      setShowInviteForm(false);
      await loadTeamData();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invitation.");
    } finally {
      setInviteSending(false);
    }
  };

  const handleCancelInvitation = async (id: number) => {
    try {
      await stockControlApiClient.cancelInvitation(id);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to cancel invitation";
      alert(msg);
    }
  };

  const handleResendInvitation = async (id: number) => {
    try {
      await stockControlApiClient.resendInvitation(id);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resend invitation";
      alert(msg);
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Team Management
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
          >
            Invite Member
          </button>
        )}
      </div>

      {collapsed ? null : (
        <>
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
                  {assignableRoles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
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
                      <th className="py-3 px-2 text-left text-xs font-medium uppercase text-gray-500">
                        Name
                      </th>
                      <th className="hidden py-3 px-2 text-left text-xs font-medium uppercase text-gray-500 sm:table-cell">
                        Email
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-medium uppercase text-gray-500">
                        Role
                      </th>
                      <th className="hidden py-3 px-2 text-left text-xs font-medium uppercase text-gray-500 md:table-cell">
                        Joined
                      </th>
                      <th className="py-3 px-2 text-right text-xs font-medium uppercase text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="py-3 px-2 text-sm text-gray-900">{member.name}</td>
                        <td className="hidden py-3 px-2 text-sm text-gray-500 sm:table-cell">
                          {member.email}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="hidden py-3 px-2 text-sm text-gray-500 md:table-cell">
                          {new Date(member.createdAt).toLocaleDateString("en-ZA")}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleSendAppLink(member.id)}
                            disabled={sendingAppLinkId === member.id}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800 disabled:opacity-50"
                          >
                            {sendingAppLinkId === member.id ? "Sending..." : "Send Link"}
                          </button>
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
                        className="flex flex-col gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 truncate">
                          <span className="text-sm text-gray-900">{inv.email}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({localRoleLabel(inv.role)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResendInvitation(inv.id)}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
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
        </>
      )}
    </div>
  );
}
