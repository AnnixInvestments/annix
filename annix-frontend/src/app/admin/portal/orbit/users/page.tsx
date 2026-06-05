"use client";

import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type { OrbitUserRow, OrbitUserType } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminDeactivateOrbitUser,
  useAdminDeleteOrbitUser,
  useAdminInviteOrbitUser,
  useAdminOrbitUsers,
  useAdminReactivateOrbitUser,
  useAdminResendOrbitUserInvite,
  useAdminUpdateOrbitUser,
} from "@/app/lib/query/hooks";

const TYPE_FILTERS: { value: "" | OrbitUserType; label: string }[] = [
  { value: "", label: "All" },
  { value: "individual", label: "Job seekers" },
  { value: "recruiter", label: "Recruiters" },
  { value: "company", label: "Employers" },
  { value: "student", label: "Students" },
];

const USER_TYPE_LABEL: Record<string, string> = {
  company: "Employer",
  recruiter: "Recruiter",
  individual: "Job seeker",
  student: "Student",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  invited: "bg-blue-50 text-blue-700 border-blue-200",
  deactivated: "bg-gray-100 text-gray-500 border-gray-200",
};

function typeLabel(value: string): string {
  const label = USER_TYPE_LABEL[value];
  return label || value;
}

function statusBadgeClass(status: string): string {
  const cls = STATUS_BADGE[status];
  return cls || "bg-gray-100 text-gray-500 border-gray-200";
}

const PAGE_SIZE = 20;

export default function OrbitUsersPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [typeFilter, setTypeFilter] = useState<"" | OrbitUserType>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const usersQuery = useAdminOrbitUsers({
    type: typeFilter || null,
    search: search || null,
    page,
    limit: PAGE_SIZE,
  });
  const invite = useAdminInviteOrbitUser();
  const update = useAdminUpdateOrbitUser();
  const deactivate = useAdminDeactivateOrbitUser();
  const reactivate = useAdminReactivateOrbitUser();
  const remove = useAdminDeleteOrbitUser();
  const resend = useAdminResendOrbitUserInvite();

  const data = usersQuery.data;
  const rows = data ? data.rows : [];
  const total = data ? data.total : 0;
  const isLoading = usersQuery.isLoading;
  const invitePending = invite.isPending;
  const saving = invitePending || update.isPending;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OrbitUserRow | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userType, setUserType] = useState<OrbitUserType>("individual");
  const [companyName, setCompanyName] = useState("");
  const [tier, setTier] = useState("");

  const showCompanyField = userType === "company" || userType === "recruiter";

  const openInvite = () => {
    setEditingUser(null);
    setEmail("");
    setFirstName("");
    setLastName("");
    setUserType("individual");
    setCompanyName("");
    setTier("");
    setIsFormOpen(true);
  };

  const openEdit = (row: OrbitUserRow) => {
    const rowFirst = row.firstName;
    const rowLast = row.lastName;
    const rowCompany = row.companyName;
    const rowTier = row.tier;
    setEditingUser(row);
    setEmail(row.email);
    setFirstName(rowFirst || "");
    setLastName(rowLast || "");
    setUserType(row.userType);
    setCompanyName(rowCompany || "");
    setTier(rowTier || "");
    setIsFormOpen(true);
  };

  const submit = async () => {
    const trimmedEmail = email.trim();
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      showToast("First name is required.", "error");
      return;
    }
    try {
      if (editingUser) {
        await update.mutateAsync({
          userId: editingUser.userId,
          input: { firstName: trimmedFirst, lastName: lastName.trim(), tier: tier.trim() },
        });
        showToast("User updated.", "success");
      } else {
        if (!trimmedEmail) {
          showToast("Email is required.", "error");
          return;
        }
        await invite.mutateAsync({
          email: trimmedEmail,
          firstName: trimmedFirst,
          lastName: lastName.trim(),
          userType,
          companyName: showCompanyField ? companyName.trim() : null,
          tier: tier.trim(),
        });
        showToast(`Invitation sent to ${trimmedEmail}.`, "success");
      }
      setIsFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      showToast(`Could not save — ${message}`, "error");
    }
  };

  const handleResend = async (row: OrbitUserRow) => {
    try {
      await resend.mutateAsync(row.userId);
      showToast(`Invitation resent to ${row.email}.`, "success");
    } catch {
      showToast("Could not resend the invitation.", "error");
    }
  };

  const handleDeactivate = async (row: OrbitUserRow) => {
    const confirmed = await confirm({
      title: "Deactivate user",
      message: `Deactivate ${row.email}? They will be blocked from signing in until reactivated. Their data is kept.`,
      confirmLabel: "Deactivate",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      await deactivate.mutateAsync(row.userId);
      showToast("User deactivated.", "success");
    } catch {
      showToast("Could not deactivate the user.", "error");
    }
  };

  const handleReactivate = async (row: OrbitUserRow) => {
    try {
      await reactivate.mutateAsync(row.userId);
      showToast("User reactivated.", "success");
    } catch {
      showToast("Could not reactivate the user.", "error");
    }
  };

  const handleDelete = async (row: OrbitUserRow) => {
    const first = await confirm({
      title: "Permanently delete user?",
      message: `Deactivating is reversible and usually safer. Permanently deleting ${row.email} cannot be undone.`,
      confirmLabel: "Continue to delete",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "This cannot be undone",
      message: `Permanently delete ${row.email} and all their Annix Orbit data and access? This is irreversible.`,
      confirmLabel: "Delete permanently",
      variant: "danger",
    });
    if (!second) return;
    try {
      await remove.mutateAsync(row.userId);
      showToast("User deleted.", "success");
    } catch {
      showToast("Could not delete the user.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orbit users</h1>
          <p className="mt-1 text-sm text-gray-600">
            Invite, configure and remove Annix Orbit accounts — job seekers, recruiters, employers
            and students. Invited users receive an email to set their password and sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={openInvite}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          + Invite user
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((filter) => {
          const filterValue = filter.value;
          const isActive = typeFilter === filterValue;
          const filterKey = filterValue || "all";
          return (
            <button
              key={filterKey}
              type="button"
              onClick={() => {
                setTypeFilter(filter.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                isActive
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or email…"
          className="ml-auto w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last login</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const nameParts = [row.firstName, row.lastName].filter(Boolean).join(" ");
                const fullName = nameParts || "—";
                const companyDisplay = row.companyName ? row.companyName : "—";
                const isDeactivated = row.status === "deactivated";
                const isInvited = row.status === "invited";
                return (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{fullName}</td>
                    <td className="px-4 py-2 text-gray-600">{row.email}</td>
                    <td className="px-4 py-2 text-gray-600">{typeLabel(row.userType)}</td>
                    <td className="px-4 py-2 text-gray-600">{companyDisplay}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs border ${statusBadgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {row.lastLoginAt ? formatDateZA(row.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="text-xs font-medium text-violet-600 hover:text-violet-800 mr-3"
                      >
                        Edit
                      </button>
                      {isInvited && (
                        <button
                          type="button"
                          onClick={() => handleResend(row)}
                          disabled={resend.isPending}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 mr-3 disabled:opacity-50"
                        >
                          Resend
                        </button>
                      )}
                      {isDeactivated ? (
                        <button
                          type="button"
                          onClick={() => handleReactivate(row)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 mr-3"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(row)}
                          className="text-xs font-medium text-amber-600 hover:text-amber-700 mr-3"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} · {total} users
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={submit}
        title={editingUser ? "Edit user" : "Invite user"}
        submitLabel={editingUser ? "Save changes" : "Send invitation"}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="ou-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="ou-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={Boolean(editingUser)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="ou-first" className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                id="ou-first"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="ou-last" className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                id="ou-last"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label htmlFor="ou-type" className="block text-sm font-medium text-gray-700 mb-1">
              User type
            </label>
            <select
              id="ou-type"
              value={userType}
              onChange={(e) => setUserType(e.target.value as OrbitUserType)}
              disabled={Boolean(editingUser)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
            >
              <option value="individual">Job seeker</option>
              <option value="recruiter">Recruiter</option>
              <option value="company">Employer</option>
              <option value="student">Student</option>
            </select>
          </div>
          {showCompanyField && !editingUser && (
            <div>
              <label htmlFor="ou-company" className="block text-sm font-medium text-gray-700 mb-1">
                {userType === "recruiter" ? "Agency name" : "Company name"}
              </label>
              <input
                id="ou-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
          <div>
            <label htmlFor="ou-tier" className="block text-sm font-medium text-gray-700 mb-1">
              Plan / tier (optional)
            </label>
            <input
              id="ou-tier"
              type="text"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              placeholder="e.g. explorer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </FormModal>

      {ConfirmDialog}
    </div>
  );
}
