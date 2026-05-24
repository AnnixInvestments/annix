"use client";

import { useState } from "react";
import type { TenantSummary } from "@/app/lib/api/tenancyAdminApi";
import type { CatalogTier } from "@/app/lib/query/hooks";
import {
  useCreateTenant,
  useInviteTenantUser,
  useLicensingCatalog,
  useRbacAppDetails,
  useTenants,
  useTransferTenantOwner,
} from "@/app/lib/query/hooks";

const MODULE_KEY = "au-rubber";

interface RoleOption {
  code: string;
  name: string;
}

function CreateTenantForm(props: { roles: RoleOption[]; tiers: CatalogTier[] }) {
  const roles = props.roles;
  const tiers = props.tiers;
  const createTenant = useCreateTenant(MODULE_KEY);

  const [companyName, setCompanyName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerRoleCode, setOwnerRoleCode] = useState("");
  const [tier, setTier] = useState("");

  const pending = createTenant.isPending;
  const isError = createTenant.isError;

  const submit = () => {
    createTenant.mutate(
      {
        companyName,
        ownerEmail,
        ownerFirstName,
        ownerLastName,
        ownerRoleCode,
        tier,
      },
      {
        onSuccess: () => {
          setCompanyName("");
          setOwnerEmail("");
          setOwnerFirstName("");
          setOwnerLastName("");
        },
      },
    );
  };

  const canSubmit =
    companyName.trim().length > 0 &&
    ownerEmail.trim().length > 0 &&
    ownerRoleCode.length > 0 &&
    tier.length > 0 &&
    !pending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-900">Onboard a tenant</h2>
      <p className="text-sm text-gray-500">
        Creates the company + its first owner user (invited by email) and sets the plan.
      </p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">
          <span className="text-gray-500">Company name</span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Owner email</span>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Owner first name</span>
          <input
            value={ownerFirstName}
            onChange={(e) => setOwnerFirstName(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Owner last name</span>
          <input
            value={ownerLastName}
            onChange={(e) => setOwnerLastName(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Owner role</span>
          <select
            value={ownerRoleCode}
            onChange={(e) => setOwnerRoleCode(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-gray-500">Plan / tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">Select a plan…</option>
            {tiers.map((tierOption) => (
              <option key={tierOption.key} value={tierOption.key}>
                {tierOption.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="mt-3 px-3 py-1.5 rounded bg-yellow-500 text-white text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create tenant"}
      </button>
      {isError ? (
        <p className="mt-2 text-sm text-red-600">
          Could not create the tenant — the owner email may already have access.
        </p>
      ) : null}
    </div>
  );
}

function TenantRow(props: { tenant: TenantSummary; roles: RoleOption[] }) {
  const tenant = props.tenant;
  const roles = props.roles;
  const inviteUser = useInviteTenantUser(MODULE_KEY);
  const transferOwner = useTransferTenantOwner(MODULE_KEY);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");

  const sendInvite = () => {
    inviteUser.mutate(
      { companyId: tenant.companyId, payload: { email: inviteEmail, roleCode: inviteRole } },
      { onSuccess: () => setInviteEmail("") },
    );
  };

  const doTransfer = () => {
    const id = Number(newOwnerId);
    if (!Number.isNaN(id) && id > 0) {
      transferOwner.mutate({ companyId: tenant.companyId, newOwnerUserId: id });
    }
  };

  const invitePending = inviteUser.isPending;
  const transferPending = transferOwner.isPending;
  const ownerUserId = tenant.ownerUserId;

  return (
    <tr className="border-b align-top">
      <td className="py-3 font-semibold">{tenant.name}</td>
      <td className="capitalize">{tenant.tier}</td>
      <td>{ownerUserId ?? "—"}</td>
      <td>{tenant.userCount}</td>
      <td className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="invite email"
            className="border rounded px-2 py-1 text-xs"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="">role…</option>
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={sendInvite}
            disabled={invitePending || inviteEmail.length === 0 || inviteRole.length === 0}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs disabled:opacity-50"
          >
            Invite
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            value={newOwnerId}
            onChange={(e) => setNewOwnerId(e.target.value)}
            placeholder="new owner user id"
            className="border rounded px-2 py-1 text-xs w-36"
          />
          <button
            type="button"
            onClick={doTransfer}
            disabled={transferPending || newOwnerId.length === 0}
            className="px-2 py-1 rounded border border-gray-300 text-xs disabled:opacity-50"
          >
            Transfer owner
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminTenantsPage() {
  const rolesQuery = useRbacAppDetails(MODULE_KEY);
  const catalogQuery = useLicensingCatalog(MODULE_KEY);
  const tenantsQuery = useTenants(MODULE_KEY);

  const rolesData = rolesQuery.data;
  const roles: RoleOption[] = rolesData ? rolesData.roles : [];
  const catalog = catalogQuery.data;
  const tiers: CatalogTier[] = catalog ? catalog.tiers : [];
  const tenantsData = tenantsQuery.data;
  const tenants = tenantsData ?? [];
  const tenantsLoading = tenantsQuery.isLoading;

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">AU Rubber tenants</h1>
      <p className="mt-1 text-sm text-gray-500">
        Each tenant is a company on its own plan. Annix staff manage tenants here; staff bypass tier
        gating.
      </p>

      <div className="mt-6">
        <CreateTenantForm roles={roles} tiers={tiers} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Tenants</h2>
        {tenantsLoading ? <p className="mt-2 text-gray-500">Loading…</p> : null}
        {tenants.length > 0 ? (
          <table className="mt-3 w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Company</th>
                <th>Plan</th>
                <th>Owner (user id)</th>
                <th>Users</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <TenantRow key={tenant.companyId} tenant={tenant} roles={roles} />
              ))}
            </tbody>
          </table>
        ) : null}
        {!tenantsLoading && tenants.length === 0 ? (
          <p className="mt-2 text-gray-500">No tenants yet — onboard one above.</p>
        ) : null}
      </div>
    </div>
  );
}
