"use client";

import Link from "next/link";
import { useState } from "react";
import type { CreateTerritoryDto, TeamMember, Territory } from "@/app/lib/api/annixRepApi";
import {
  useAssignTerritory,
  useCreateTerritory,
  useDeleteTerritory,
  useOrganization,
  useTeamMembers,
  useTerritories,
  useUpdateTerritory,
} from "@/app/lib/query/hooks";

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

function TerritoryModal({
  territory,
  members,
  onClose,
}: {
  territory: Territory | null;
  members: TeamMember[];
  onClose: () => void;
}) {
  const createTerritory = useCreateTerritory();
  const updateTerritory = useUpdateTerritory();

  const [name, setName] = useState(territory?.name || "");
  const [description, setDescription] = useState(territory?.description || "");
  const [provinces, setProvinces] = useState<string[]>(territory?.provinces || []);
  const [cities, setCities] = useState(territory?.cities?.join(", ") || "");

  const handleProvinceToggle = (province: string) => {
    setProvinces((prev) =>
      prev.includes(province) ? prev.filter((p) => p !== province) : [...prev, province],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto: CreateTerritoryDto = {
      name,
      description: description || undefined,
      provinces: provinces.length > 0 ? provinces : undefined,
      cities: cities
        ? cities
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : undefined,
    };

    if (territory) {
      await updateTerritory.mutateAsync({ id: territory.id, dto });
    } else {
      await createTerritory.mutateAsync(dto);
    }

    onClose();
  };

  const isPending = createTerritory.isPending || updateTerritory.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {territory ? "Edit Territory" : "Create Territory"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Territory Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="e.g., Gauteng North"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                rows={2}
                placeholder="Optional description for this territory"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provinces
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SA_PROVINCES.map((province) => (
                  <label
                    key={province}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      provinces.includes(province)
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                        : "bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={provinces.includes(province)}
                      onChange={() => handleProvinceToggle(province)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{province}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cities (comma-separated)
              </label>
              <input
                type="text"
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                placeholder="e.g., Pretoria, Centurion, Midrand"
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
                disabled={isPending || !name.trim()}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : territory ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AssignTerritoryModal({
  territory,
  members,
  onClose,
}: {
  territory: Territory;
  members: TeamMember[];
  onClose: () => void;
}) {
  const assignTerritory = useAssignTerritory();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(territory.assignedToId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignTerritory.mutateAsync({ id: territory.id, userId: selectedUserId });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Assign Territory
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Select a team member to assign to &quot;{territory.name}&quot;
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Team Member
              </label>
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.userId}>
                    {member.user?.name || member.user?.email}
                  </option>
                ))}
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
                disabled={assignTerritory.isPending}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {assignTerritory.isPending ? "Assigning..." : "Assign"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TerritoryCard({
  territory,
  members,
  canManage,
}: {
  territory: Territory;
  members: TeamMember[];
  canManage: boolean;
}) {
  const deleteTerritory = useDeleteTerritory();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const assignedMember = members.find((m) => m.userId === territory.assignedToId);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${territory.name}"?`)) {
      await deleteTerritory.mutateAsync(territory.id);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {territory.name}
            </h3>
            {territory.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {territory.description}
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Edit territory"
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
                onClick={handleDelete}
                disabled={deleteTerritory.isPending}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title="Delete territory"
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
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {territory.provinces && territory.provinces.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Provinces
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {territory.provinces.map((province) => (
                  <span
                    key={province}
                    className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded"
                  >
                    {province}
                  </span>
                ))}
              </div>
            </div>
          )}

          {territory.cities && territory.cities.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Cities
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {territory.cities.join(", ")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Assigned To
              </span>
              {assignedMember ? (
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {assignedMember.user?.name || assignedMember.user?.email}
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">Unassigned</p>
              )}
            </div>
            {canManage && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-3 py-1.5 text-sm border border-amber-300 dark:border-amber-700 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30"
              >
                {assignedMember ? "Reassign" : "Assign"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <TerritoryModal
          territory={territory}
          members={members}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showAssignModal && (
        <AssignTerritoryModal
          territory={territory}
          members={members}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </>
  );
}

export default function TerritoriesPage() {
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: territories, isLoading: territoriesLoading } = useTerritories();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isLoading = orgLoading || territoriesLoading || membersLoading;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Territories</h1>
        </div>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-lg" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Territories</h1>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200">
            You need to create an organization first before managing territories.
          </p>
          <Link
            href="/fieldflow/settings/team"
            className="inline-block mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Create Organization
          </Link>
        </div>
      </div>
    );
  }

  const currentMember = members?.find((m) => m.userId === organization.ownerId);
  const canManage = currentMember?.role === "admin" || currentMember?.role === "manager";

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Territories</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Define sales territories and assign team members
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Territory
          </button>
        )}
      </div>

      {territories && territories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {territories.map((territory) => (
            <TerritoryCard
              key={territory.id}
              territory={territory}
              members={members || []}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Territories Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create territories to assign sales regions to your team members.
          </p>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Create First Territory
            </button>
          )}
        </div>
      )}

      {showCreateModal && (
        <TerritoryModal
          territory={null}
          members={members || []}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
