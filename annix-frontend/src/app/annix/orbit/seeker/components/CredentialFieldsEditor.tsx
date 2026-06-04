"use client";

import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type { CredentialFields, IndividualDocument } from "@/app/lib/api/annixOrbitApi";
import { useOrbitUpdateMyDocumentCredentialFields } from "@/app/lib/query/hooks";

interface CredentialFieldsEditorProps {
  doc: IndividualDocument;
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_ROWS: Array<{ key: keyof CredentialFields; label: string; placeholder: string }> = [
  { key: "credentialName", label: "Name", placeholder: "e.g. BSc Civil Engineering" },
  { key: "issuer", label: "Issued by", placeholder: "e.g. University of Pretoria" },
  { key: "dateAwarded", label: "Year / date awarded", placeholder: "e.g. 2018" },
  { key: "nqfLevel", label: "NQF level", placeholder: "e.g. NQF 7" },
  { key: "expiry", label: "Expiry (if any)", placeholder: "e.g. 2027" },
];

function textValue(value: string | null | undefined): string {
  return value == null ? "" : value;
}

function initialForm(doc: IndividualDocument): Record<keyof CredentialFields, string> {
  const fields = doc.credentialFields;
  if (!fields) {
    return { credentialName: "", issuer: "", dateAwarded: "", nqfLevel: "", expiry: "" };
  }
  return {
    credentialName: textValue(fields.credentialName),
    issuer: textValue(fields.issuer),
    dateAwarded: textValue(fields.dateAwarded),
    nqfLevel: textValue(fields.nqfLevel),
    expiry: textValue(fields.expiry),
  };
}

export function CredentialFieldsEditor(props: CredentialFieldsEditorProps) {
  const { doc, isOpen, onClose } = props;
  const updateFields = useOrbitUpdateMyDocumentCredentialFields();
  const { showToast } = useToast();
  const [form, setForm] = useState<Record<keyof CredentialFields, string>>(() => initialForm(doc));

  const handleChange = (key: keyof CredentialFields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    updateFields.mutate(
      { id: doc.id, fields: form },
      {
        onSuccess: () => {
          showToast("Details saved. Thanks — this helps Nix read these better.", "success");
          onClose();
        },
        onError: () => {
          showToast("Couldn't save those details — please try again.", "error");
        },
      },
    );
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Edit credential details"
      submitLabel="Save details"
      loading={updateFields.isPending}
    >
      <p className="text-sm text-gray-600 mb-4">
        Fix anything Nix read incorrectly. Your corrections help Nix read these documents more
        accurately over time.
      </p>
      <div className="space-y-3">
        {FIELD_ROWS.map((row) => {
          const value = form[row.key];
          return (
            <label key={row.key} className="block">
              <span className="text-sm font-medium text-gray-700">{row.label}</span>
              <input
                type="text"
                value={value}
                placeholder={row.placeholder}
                onChange={(event) => handleChange(row.key, event.target.value)}
                className="mt-1 w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-[var(--brand-navbar,#323288)]"
              />
            </label>
          );
        })}
      </div>
    </FormModal>
  );
}
