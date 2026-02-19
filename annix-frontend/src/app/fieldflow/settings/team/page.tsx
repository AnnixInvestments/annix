"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CreateInvitationDto,
  CreateOrganizationDto,
  TeamMember,
  TeamRole,
} from "@/app/lib/api/annixRepApi";
import {
  useCancelTeamInvitation,
  useCreateOrganization,
  useOrganization,
  useRemoveMember,
  useResendTeamInvitation,
  useSendInvitation,
  useTeamInvitations,
  useTeamMembers,
  useUpdateMemberRole,
  useUpdateOrganization,
} from "@/app/lib/query/hooks";

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  manager: "Manager",
  rep: "Rep",
};

const ROLE_COLORS: Record<TeamRole, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  rep: "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300",
};

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function CreateOrganizationForm() {
  const createOrg = useCreateOrganization();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateOrganizationDto = { name, industry: industry || undefined };
    await createOrg.mutateAsync(dto);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center max-w-lg mx-auto">
      <svg
        className="w-12 h-12 mx-auto text-indigo-600 dark:text-indigo-400 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Create Your Organization
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Set up an organization to invite team members and collaborate on prospects.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Organization Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            placeholder="Acme Sales Team"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Industry (Optional)
          </label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            placeholder="Technology, Healthcare, etc."
          />
        </div>

        <button
          type="submit"
          disabled={createOrg.isPending || !name.trim()}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {createOrg.isPending ? "Creating..." : "Create Organization"}
        </button>
      </form>
    </div>
  );
}

function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const sendInvitation = useSendInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("rep");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateInvitationDto = {
      email,
      role,
      message: message || undefined,
    };
    await sendInvitation.mutateAsync(dto);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Invite Team Member
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="colleague@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="rep">Rep - Can manage their own prospects</option>
                <option value="manager">Manager - Can view team data and assign territories</option>
                <option value="admin">Admin - Full organization management</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Join our sales team on Annix Rep!"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendInvitation.isPending || !email.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendInvitation.isPending ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChangeRoleModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const updateRole = useUpdateMemberRole();
  const [role, setRole] = useState<TeamRole>(member.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateRole.mutateAsync({ id: member.id, role });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Role</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Update role for {member.user?.name || member.user?.email}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="rep">Rep</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateRole.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateRole.isPending ? "Updating..." : "Update Role"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TeamMemberCard({
  member,
  isCurrentUser,
  canManage,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
  canManage: boolean;
}) {
  const removeMember = useRemoveMember();
  const [showRoleModal, setShowRoleModal] = useState(false);

  const handleRemove = async () => {
    if (confirm(`Are you sure you want to remove ${member.user?.name || member.user?.email}?`)) {
      await removeMember.mutateAsync(member.id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              {(member.user?.name || member.user?.email || "?")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {member.user?.name || member.user?.email}
              </span>
              {isCurrentUser && (
                <span className="text-xs text-gray-500 dark:text-gray-400">(You)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{member.user?.email}</span>
              <RoleBadge role={member.role} />
            </div>
          </div>
        </div>

        {canManage && !isCurrentUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRoleModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Change role"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
            <button
              onClick={handleRemove}
              disabled={removeMember.isPending}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              title="Remove member"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {showRoleModal && <ChangeRoleModal member={member} onClose={() => setShowRoleModal(false)} />}
    </>
  );
}

function PendingInvitationsSection() {
  const { data: invitations, isLoading } = useTeamInvitations();
  const cancelInvitation = useCancelTeamInvitation();
  const resendInvitation = useResendTeamInvitation();

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") || [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Pending Invitations
      </h2>

      <div className="space-y-3">
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
          >
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{invitation.email}</span>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={invitation.role} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Expires{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resendInvitation.mutate(invitation.id)}
                disabled={resendInvitation.isPending}
                className="px-3 py-1 text-sm border border-amber-300 dark:border-amber-700 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                Resend
              </button>
              <button
                onClick={() => cancelInvitation.mutate(invitation.id)}
                disabled={cancelInvitation.isPending}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrganizationSettings() {
  const { data: organization } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(organization?.name || "");
  const [industry, setIndustry] = useState(organization?.industry || "");

  const handleSave = async () => {
    if (!organization) return;
    await updateOrg.mutateAsync({
      id: organization.id,
      dto: { name, industry: industry || undefined },
    });
    setIsEditing(false);
  };

  if (!organization) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization</h2>
        {!isEditing && (
          <button
            onClick={() => {
              setName(organization.name);
              setIndustry(organization.industry || "");
              setIsEditing(true);
            }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Industry
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateOrg.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateOrg.isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              {organization.name}
            </dd>
          </div>
          {organization.industry && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Industry</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {organization.industry}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500 dark:text-gray-400">Plan</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {organization.plan}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export default function TeamSettingsPage() {
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isLoading = orgLoading || membersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/fieldflow/settings"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Settings</h1>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/fieldflow/settings"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Settings</h1>
        </div>
        <CreateOrganizationForm />
      </div>
    );
  }

  const currentUserMember = members?.find((m) => m.userId === organization.ownerId);
  const canManage = currentUserMember?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fieldflow/settings"
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your organization and team members
          </p>
        </div>
      </div>

      <OrganizationSettings />

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {members?.length || 0} of {organization.maxMembers} members
            </p>
          </div>
          {canManage && (members?.length || 0) < organization.maxMembers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        <div className="space-y-3">
          {members?.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.userId === organization.ownerId}
              canManage={canManage}
            />
          ))}
        </div>
      </div>

      <PendingInvitationsSection />

      {showInviteModal && <InviteMemberModal onClose={() => setShowInviteModal(false)} />}
    </div>
  );
}
