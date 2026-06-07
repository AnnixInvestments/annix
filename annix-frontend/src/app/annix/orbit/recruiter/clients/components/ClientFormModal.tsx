"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type { OrbitClient, OrbitClientInput } from "@/app/lib/api/annixOrbitApi";
import { SOUTH_AFRICAN_PROVINCES } from "@/app/lib/config/registration/constants";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useOrbitCreateClient, useOrbitUpdateClient } from "@/app/lib/query/hooks";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "inactive", label: "Inactive" },
];

interface ClientFormModalProps {
  client: OrbitClient | null;
  onClose: () => void;
}

export function ClientFormModal(props: ClientFormModalProps) {
  const client = props.client;
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const createMutation = useOrbitCreateClient();
  const updateMutation = useOrbitUpdateClient();

  const [name, setName] = useState(client ? client.name : "");
  const [industry, setIndustry] = useState(client?.industry ? client.industry : "");
  const [province, setProvince] = useState(client?.province ? client.province : "");
  const [city, setCity] = useState(client?.city ? client.city : "");
  const [contactName, setContactName] = useState(client?.contactName ? client.contactName : "");
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ? client.contactEmail : "");
  const [contactPhone, setContactPhone] = useState(client?.contactPhone ? client.contactPhone : "");
  const [feePercentage, setFeePercentage] = useState(
    client && client.feePercentage !== null ? String(client.feePercentage) : "",
  );
  const [paymentTerms, setPaymentTerms] = useState(client?.paymentTerms ? client.paymentTerms : "");
  const [status, setStatus] = useState(client ? client.status : "prospect");
  const [notes, setNotes] = useState(client?.notes ? client.notes : "");

  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Client name is required.", "error");
      return;
    }

    const parsedFee = feePercentage.trim() ? Number(feePercentage) : null;
    if (parsedFee !== null && Number.isNaN(parsedFee)) {
      showToast("Fee % must be a number.", "error");
      return;
    }

    const payload: OrbitClientInput = {
      name: trimmedName,
      industry: industry.trim() || null,
      province: province || null,
      city: city.trim() || null,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      feePercentage: parsedFee,
      paymentTerms: paymentTerms.trim() || null,
      status,
      notes: notes.trim() || null,
    };

    try {
      if (client) {
        await updateMutation.mutateAsync({ id: client.id, data: payload });
        showToast("Client updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Client added.", "success");
      }
      props.onClose();
    } catch {
      alert({ message: "Could not save the client. Please try again.", variant: "error" });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {AlertDialog}
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#0A1B3D]">
              {client ? "Edit client" : "Add client"}
            </h2>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-1">
                Company name
              </label>
              <input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="Example Corp"
              />
            </div>

            <div>
              <label
                htmlFor="client-industry"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Industry
              </label>
              <input
                id="client-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="Mining"
              />
            </div>

            <div>
              <label
                htmlFor="client-status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Relationship status
              </label>
              <select
                id="client-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="client-province"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Province
              </label>
              <select
                id="client-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
              >
                <option value="">Select province</option>
                {SOUTH_AFRICAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="client-city" className="block text-sm font-medium text-gray-700 mb-1">
                City / town
              </label>
              <input
                id="client-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="Johannesburg"
              />
            </div>

            <div>
              <label
                htmlFor="client-contact-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact person
              </label>
              <input
                id="client-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label
                htmlFor="client-contact-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact email
              </label>
              <input
                id="client-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="hiring@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="client-contact-phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact phone
              </label>
              <input
                id="client-contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="+27 11 000 0000"
              />
            </div>

            <div>
              <label htmlFor="client-fee" className="block text-sm font-medium text-gray-700 mb-1">
                Placement fee %
              </label>
              <input
                id="client-fee"
                inputMode="decimal"
                value={feePercentage}
                onChange={(e) => setFeePercentage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="12.5"
              />
            </div>

            <div>
              <label
                htmlFor="client-terms"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Payment terms
              </label>
              <input
                id="client-terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="30 days"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="client-notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Relationship notes
              </label>
              <textarea
                id="client-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent"
                placeholder="Prefers stable work history; fast interview process."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#323288] text-white rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : client ? "Save changes" : "Add client"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
