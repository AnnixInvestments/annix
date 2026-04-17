"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CompanyRole,
  StockControlInvitation,
  StockControlTeamMember,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { fromISO } from "@/app/lib/datetime";
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
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(msg);
    }
  };

  const handleSendAppLink = async (memberId: number) => {
    setSendingAppLinkId(memberId);
    try {
      await stockControlApiClient.sendAppLink(memberId);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert("App link sent successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send app link";
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
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
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(msg);
    }
  };

  const handleResendInvitation = async (id: number) => {
    try {
      await stockControlApiClient.resendInvitation(id);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resend invitation";
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(msg);
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
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
            className="px-2.5 py-1 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition-colors"
          >
            + Invite
          </button>
        )}
      </div>

      {collapsed ? null : (
        <>
          {showInviteForm && (
            <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex gap-1.5">
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError("");
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-teal-500 focus:border-teal-500"
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
                  className="px-2.5 py-1 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {inviteSending ? "..." : "Send"}
                </button>
              </div>
              {inviteError && <p className="mt-1 text-xs text-red-600">{inviteError}</p>}
            </div>
          )}

          {teamLoading ? (
            <div className="text-center py-2 text-xs text-gray-500">Loading team...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-1.5 px-2 text-left text-[10px] font-medium uppercase text-gray-500">
                        Name
                      </th>
                      <th className="hidden py-1.5 px-2 text-left text-[10px] font-medium uppercase text-gray-500 sm:table-cell">
                        Email
                      </th>
                      <th className="py-1.5 px-2 text-left text-[10px] font-medium uppercase text-gray-500">
                        Role
                      </th>
                      <th className="hidden py-1.5 px-2 text-left text-[10px] font-medium uppercase text-gray-500 md:table-cell">
                        Joined
                      </th>
                      <th className="py-1.5 px-2 text-right text-[10px] font-medium uppercase text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="py-1 px-2 text-xs text-gray-900">{member.name}</td>
                        <td className="hidden py-1 px-2 text-xs text-gray-500 sm:table-cell">
                          {member.email}
                        </td>
                        <td className="py-1 px-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="rounded border border-gray-200 px-1 py-0.5 text-xs bg-transparent focus:border-teal-500 focus:outline-none focus:ring-teal-500"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="hidden py-1 px-2 text-xs text-gray-500 md:table-cell">
                          {fromISO(member.createdAt).toJSDate().toLocaleDateString("en-ZA")}
                        </td>
                        <td className="py-1 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleSendAppLink(member.id)}
                            disabled={sendingAppLinkId === member.id}
                            className="text-[10px] font-medium text-teal-600 hover:text-teal-800 disabled:opacity-50"
                          >
                            {sendingAppLinkId === member.id ? "..." : "Send Link"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invitations.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Pending Invitations
                  </span>
                  <div className="divide-y divide-yellow-100 border border-yellow-200 rounded mt-1">
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between px-2.5 py-1.5 bg-yellow-50/50"
                      >
                        <div className="min-w-0 truncate">
                          <span className="text-xs text-gray-900">{inv.email}</span>
                          <span className="ml-1.5 text-[10px] text-gray-500">
                            ({localRoleLabel(inv.role)})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResendInvitation(inv.id)}
                            className="text-[10px] font-medium text-teal-600 hover:text-teal-800"
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="text-[10px] font-medium text-red-600 hover:text-red-800"
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
