"use client";

import { isString } from "es-toolkit/compat";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { NixExtractionSummary } from "@/app/lib/query/hooks";
import { useCreateMineLibraryMine } from "@/app/lib/query/hooks";

interface CreateMineModalProps {
  seedFromExtraction?: NixExtractionSummary | null;
  onCreated?: (mineId: number) => void;
  onClose: () => void;
}

export function CreateMineModal(props: CreateMineModalProps) {
  const { seedFromExtraction, onCreated, onClose } = props;
  const createMutation = useCreateMineLibraryMine();
  const { showToast } = useToast();

  const seedDefaults = useMemo(
    () => seedDefaultsFromExtraction(seedFromExtraction ?? null),
    [seedFromExtraction],
  );

  const [mineName, setMineName] = useState(seedDefaults.mineName);
  const [operatingCompany, setOperatingCompany] = useState(seedDefaults.operatingCompany);
  const [province, setProvince] = useState(seedDefaults.province);

  useEffect(() => {
    setMineName(seedDefaults.mineName);
    setOperatingCompany(seedDefaults.operatingCompany);
    setProvince(seedDefaults.province);
  }, [seedDefaults.mineName, seedDefaults.operatingCompany, seedDefaults.province]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mineName.trim().length === 0 || operatingCompany.trim().length === 0) {
      showToast("Mine name and operating company are required.", "error");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        mineName: mineName.trim(),
        operatingCompany: operatingCompany.trim(),
        province: province.trim() || undefined,
        retagExtractionId: seedFromExtraction?.id,
      });
      showToast(
        seedFromExtraction
          ? `Created mine '${result.mine.mineName}' and tagged this extraction.`
          : `Created mine '${result.mine.mineName}'.`,
        "success",
      );
      onCreated?.(result.mine.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't create the mine.";
      showToast(message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mt-16 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Create new mine</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {seedFromExtraction ? (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
            Seeded from extraction #{seedFromExtraction.id} —{" "}
            <span className="font-medium">{seedFromExtraction.documentName}</span>. Saving will also
            tag this extraction against the new mine.
          </p>
        ) : null}

        <Field label="Mine name *">
          <input
            type="text"
            value={mineName}
            onChange={(event) => setMineName(event.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="e.g. Langer Heinrich"
            required
            maxLength={255}
          />
        </Field>

        <Field label="Operating company *">
          <input
            type="text"
            value={operatingCompany}
            onChange={(event) => setOperatingCompany(event.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="e.g. Paladin Energy"
            required
            maxLength={255}
          />
        </Field>

        <Field label="Province">
          <input
            type="text"
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="e.g. Northern Cape (or leave blank)"
            maxLength={100}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded px-3 py-1.5"
          >
            {createMutation.isPending ? "Creating…" : "Create mine"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-700">
      <span className="font-medium">{props.label}</span>
      {props.children}
    </label>
  );
}

const seedDefaultsFromExtraction = (
  extraction: NixExtractionSummary | null,
): { mineName: string; operatingCompany: string; province: string } => {
  if (!extraction) return { mineName: "", operatingCompany: "", province: "" };
  const rawData = extraction.extractedData;
  const data = (rawData ? rawData : {}) as Record<string, unknown>;
  const rawMetadata = data.metadata;
  const metadata = (rawMetadata ? rawMetadata : data) as Record<string, unknown>;
  const project = stringField(metadata, ["project", "projectName", "projectTitle"]);
  const customer = stringField(metadata, ["customer", "customerName", "operator", "client"]);
  return {
    mineName: project ? project : "",
    operatingCompany: customer ? customer : "",
    province: "",
  };
};

const stringField = (obj: Record<string, unknown>, keys: readonly string[]): string | null => {
  const found = keys
    .map((k) => obj[k])
    .find((v): v is string => isString(v) && v.trim().length > 0);
  return found ? found.trim() : null;
};
