"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCancelTeamInvite,
  useOrbitCreateTeamInvite,
  useOrbitRemoveTeamMember,
  useOrbitTeam,
  useOrbitUpdateMemberRole,
} from "@/app/lib/query/hooks";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "recruiter", label: "Recruiter" },
  { value: "assistant", label: "Assistant" },
];

function roleLabel(role: string | null): string {
  const found = ROLE_OPTIONS.find((r) => r.value === role);
  return found ? found.label : "—";
}

export default function RecruiterSettingsPage() {
  const { user } = useAnnixOrbitAuth();
  const myRole = user?.recruiterRole ? user.recruiterRole : null;
  const canManage = myRole === "owner" || myRole === "manager";
  const currentUserId = user ? user.id : -1;

  const { data: team, isLoading } = useOrbitTeam();
  const inviteMutation = useOrbitCreateTeamInvite();
  const roleMutation = useOrbitUpdateMemberRole();
  const removeMutation = useOrbitRemoveTeamMember();
  const cancelMutation = useOrbitCancelTeamInvite();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");

  const members = team ? team.members : [];
  const invites = team ? team.invites : [];

  const sendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      showToast("Enter an email address to invite.", "error");
      return;
    }
    try {
      await inviteMutation.mutateAsync({ email, recruiterRole: inviteRole });
      setInviteEmail("");
      showToast("Invitation sent.", "success");
    } catch {
      showToast("Could not send the invitation. Please try again.", "error");
    }
  };

  const removeMember = async (userId: number, name: string) => {
    const confirmed = window.confirm(
      `Remove ${name} from the agency? They lose access on their next request - their account itself is not deleted.`,
    );
    if (!confirmed) return;
    try {
      await removeMutation.mutateAsync(userId);
    } catch {
      window.alert("Could not remove that teammate. Please try again.");
    }
  };

  const changeRole = async (userId: number, recruiterRole: string) => {
    try {
      await roleMutation.mutateAsync({ userId, recruiterRole });
      showToast("Role updated.", "success");
    } catch {
      showToast("Could not update the role. Please try again.", "error");
    }
  };

  const cancelInvite = async (id: number, email: string) => {
    const confirmed = await confirm({
      title: "Cancel this invitation?",
      message: `The pending invite to ${email} will be cancelled.`,
      confirmLabel: "Cancel invite",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await cancelMutation.mutateAsync(id);
      showToast("Invitation cancelled.", "success");
    } catch {
      showToast("Could not cancel the invitation. Please try again.", "error");
    }
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Settings</h1>
        <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
          Your agency team and roles. You are {roleLabel(myRole)}.
        </p>
      </div>

      {canManage ? (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-[#0A1B3D] dark:text-white">
            Invite a teammate
          </h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={`${inputClasses} sm:col-span-1`}
              placeholder="teammate@example.com"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={`${inputClasses} bg-white`}
            >
              {ROLE_OPTIONS.filter((r) => r.value !== "owner").map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={sendInvite}
              disabled={inviteMutation.isPending}
              className="px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] disabled:opacity-50"
            >
              {inviteMutation.isPending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-[#0A1B3D] dark:text-white">Team</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#323288]" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/10">
            {members.map((member) => {
              const rawRole = member.recruiterRole;
              const memberRole = rawRole ?? "recruiter";
              const rolePending = roleMutation.isPending;
              const removePending = removeMutation.isPending;
              const isSelf = member.userId === currentUserId;
              return (
                <li
                  key={member.userId}
                  className="px-5 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-[#252560] dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={memberRole}
                        onChange={(e) => changeRole(member.userId, e.target.value)}
                        disabled={rolePending || isSelf}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm disabled:opacity-60"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void removeMember(member.userId, member.name)}
                        disabled={removePending || isSelf}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-[#323288] dark:text-[#9ea0e8]">
                      {roleLabel(member.recruiterRole)}
                    </span>
                  )}
                </li>
              );
            })}

            {invites.map((invite) => (
              <li
                key={`invite-${invite.id}`}
                className="px-5 py-3 flex items-center justify-between gap-4 bg-amber-50/40"
              >
                <div>
                  <p className="font-medium text-gray-700">{invite.email}</p>
                  <p className="text-xs text-amber-700">
                    Pending invite · {roleLabel(invite.recruiterRole)}
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => cancelInvite(invite.id, invite.email)}
                    disabled={cancelMutation.isPending}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ConfirmDialog}
    </div>
  );
}
