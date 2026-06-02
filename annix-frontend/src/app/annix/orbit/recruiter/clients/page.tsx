"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitClient } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useOrbitClients, useOrbitDeleteClient } from "@/app/lib/query/hooks";
import { ClientFormModal } from "./components/ClientFormModal";

function clientStatusMeta(status: string): { label: string; classes: string } {
  if (status === "active") {
    return { label: "Active", classes: "bg-green-100 text-green-700" };
  }
  if (status === "on_hold") {
    return { label: "On hold", classes: "bg-amber-100 text-amber-700" };
  }
  if (status === "inactive") {
    return { label: "Inactive", classes: "bg-gray-100 text-gray-600" };
  }
  return { label: "Prospect", classes: "bg-[#e0e0f5] text-[#323288]" };
}

export default function RecruiterClientsPage() {
  const { data: clients = [], isLoading, isError } = useOrbitClients();
  const deleteMutation = useOrbitDeleteClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitClient | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (client: OrbitClient) => {
    setEditing(client);
    setModalOpen(true);
  };

  const handleDelete = async (client: OrbitClient) => {
    const confirmed = await confirm({
      title: "Delete this client?",
      message: `"${client.name}" and its CRM details will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(client.id);
      showToast("Client deleted.", "success");
    } catch {
      showToast("Could not delete the client. Please try again.", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Clients</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            The companies you place into — contacts, fee terms and relationship notes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add client
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your clients — please try again.
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No clients yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Add your first client to start managing vacancies and submissions against it.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Add client
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {clients.map((client) => {
                  const industry = client.industry ? client.industry : "—";
                  const locationParts = [client.city, client.province].filter(Boolean).join(", ");
                  const location = locationParts ? locationParts : "—";
                  const contact = client.contactName ? client.contactName : "—";
                  const meta = clientStatusMeta(client.status);
                  return (
                    <tr
                      key={client.id}
                      onClick={() => openEdit(client)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {client.name}
                        </div>
                        <div className="text-sm text-gray-500">{industry}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {location}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {contact}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(client);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen ? <ClientFormModal client={editing} onClose={() => setModalOpen(false)} /> : null}
      {ConfirmDialog}
    </div>
  );
}
