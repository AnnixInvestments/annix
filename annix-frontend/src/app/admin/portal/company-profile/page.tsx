"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  CompanyProfileResponse,
  DirectorResponse,
  UpdateCompanyProfileRequest,
} from "@/app/lib/api/adminApi";
import { useAnnixCompanyProfile, useUpdateAnnixCompanyProfile } from "@/app/lib/query/hooks";

const inputClass =
  "block w-full rounded-md border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function Field(props: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{props.label}</label>
      <input
        type={props.type || "text"}
        className={inputClass}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
      />
    </div>
  );
}

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{props.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{props.children}</div>
    </div>
  );
}

function DirectorsSection(props: {
  directors: DirectorResponse[];
  onChange: (directors: DirectorResponse[]) => void;
}) {
  const handleAdd = () => {
    props.onChange([...props.directors, { name: "", title: "", email: "" }]);
  };

  const handleRemove = (index: number) => {
    props.onChange(props.directors.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof DirectorResponse, value: string) => {
    props.onChange(props.directors.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Directors</h2>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Director
        </button>
      </div>
      {props.directors.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No directors added yet.</p>
      )}
      <div className="space-y-4">
        {props.directors.map((director, index) => (
          <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Director {index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field
                label="Name"
                value={director.name}
                onChange={(val) => handleUpdate(index, "name", val)}
                placeholder="Full name"
              />
              <Field
                label="Title"
                value={director.title}
                onChange={(val) => handleUpdate(index, "title", val)}
                placeholder="e.g. Managing Director"
              />
              <Field
                label="Email"
                value={director.email}
                onChange={(val) => handleUpdate(index, "email", val)}
                type="email"
                placeholder="director@example.com"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formStateFromProfile(
  profile: CompanyProfileResponse,
): UpdateCompanyProfileRequest & { directors: DirectorResponse[] } {
  return {
    legalName: profile.legalName,
    tradingName: profile.tradingName,
    registrationNumber: profile.registrationNumber,
    vatNumber: profile.vatNumber || "",
    entityType: profile.entityType || "",
    streetAddress: profile.streetAddress || "",
    city: profile.city || "",
    province: profile.province || "",
    postalCode: profile.postalCode || "",
    country: profile.country,
    phone: profile.phone || "",
    generalEmail: profile.generalEmail || "",
    supportEmail: profile.supportEmail || "",
    privacyEmail: profile.privacyEmail || "",
    websiteUrl: profile.websiteUrl || "",
    informationOfficerName: profile.informationOfficerName || "",
    informationOfficerEmail: profile.informationOfficerEmail || "",
    jurisdiction: profile.jurisdiction,
    primaryDomain: profile.primaryDomain || "",
    noReplyEmail: profile.noReplyEmail || "",
    mailerName: profile.mailerName || "",
    directors: profile.directors.map((d) => ({ ...d })),
  };
}

type FormState = ReturnType<typeof formStateFromProfile>;

export default function CompanyProfilePage() {
  const { data: profile, isLoading } = useAnnixCompanyProfile();
  const updateMutation = useUpdateAnnixCompanyProfile();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (profile && !form) {
      setForm(formStateFromProfile(profile));
    }
  }, [profile, form]);

  const updateField = (field: keyof Omit<FormState, "directors">) => (value: string) => {
    if (form) {
      setForm({ ...form, [field]: value });
    }
  };

  const handleSave = () => {
    if (!form) return;
    updateMutation.mutate(form, {
      onSuccess: () => {
        showToast("Company profile updated successfully", "success");
      },
      onError: (error) => {
        showToast(error.message, "error");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-red-500 text-lg font-medium">Failed to load company profile</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The company profile may not be seeded yet. Ensure the migration has been run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Company Profile</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage Annix company details used across all applications.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <SectionCard title="Core Identity">
        <Field
          label="Legal Name"
          value={form.legalName || ""}
          onChange={updateField("legalName")}
        />
        <Field
          label="Trading Name"
          value={form.tradingName || ""}
          onChange={updateField("tradingName")}
        />
        <Field
          label="Registration Number"
          value={form.registrationNumber || ""}
          onChange={updateField("registrationNumber")}
        />
        <Field
          label="VAT Number"
          value={form.vatNumber || ""}
          onChange={updateField("vatNumber")}
        />
        <Field
          label="Entity Type"
          value={form.entityType || ""}
          onChange={updateField("entityType")}
          placeholder="e.g. Private Company (Pty) Ltd"
        />
      </SectionCard>

      <SectionCard title="Contact Details">
        <div className="md:col-span-2">
          <Field
            label="Street Address"
            value={form.streetAddress || ""}
            onChange={updateField("streetAddress")}
          />
        </div>
        <Field label="City" value={form.city || ""} onChange={updateField("city")} />
        <Field label="Province" value={form.province || ""} onChange={updateField("province")} />
        <Field
          label="Postal Code"
          value={form.postalCode || ""}
          onChange={updateField("postalCode")}
        />
        <Field label="Country" value={form.country || ""} onChange={updateField("country")} />
        <Field label="Phone" value={form.phone || ""} onChange={updateField("phone")} type="tel" />
        <Field
          label="Website URL"
          value={form.websiteUrl || ""}
          onChange={updateField("websiteUrl")}
          type="url"
        />
        <Field
          label="General Email"
          value={form.generalEmail || ""}
          onChange={updateField("generalEmail")}
          type="email"
        />
        <Field
          label="Support Email"
          value={form.supportEmail || ""}
          onChange={updateField("supportEmail")}
          type="email"
        />
        <Field
          label="Privacy Email"
          value={form.privacyEmail || ""}
          onChange={updateField("privacyEmail")}
          type="email"
        />
      </SectionCard>

      <SectionCard title="Legal & Compliance">
        <Field
          label="Information Officer Name"
          value={form.informationOfficerName || ""}
          onChange={updateField("informationOfficerName")}
        />
        <Field
          label="Information Officer Email"
          value={form.informationOfficerEmail || ""}
          onChange={updateField("informationOfficerEmail")}
          type="email"
        />
        <Field
          label="Jurisdiction"
          value={form.jurisdiction || ""}
          onChange={updateField("jurisdiction")}
        />
      </SectionCard>

      <SectionCard title="Email Configuration">
        <Field
          label="Primary Domain"
          value={form.primaryDomain || ""}
          onChange={updateField("primaryDomain")}
          placeholder="e.g. annix.co.za"
        />
        <Field
          label="No-Reply Email"
          value={form.noReplyEmail || ""}
          onChange={updateField("noReplyEmail")}
          type="email"
        />
        <Field
          label="Mailer Name"
          value={form.mailerName || ""}
          onChange={updateField("mailerName")}
          placeholder="Display name in outgoing emails"
        />
      </SectionCard>

      <DirectorsSection
        directors={form.directors}
        onChange={(directors) => setForm({ ...form, directors })}
      />

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
