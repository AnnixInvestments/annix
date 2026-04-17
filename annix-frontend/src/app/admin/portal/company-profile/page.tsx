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
        type={(() => {
          const rawType = props.type;
          return rawType || "text";
        })()}
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
    vatNumber: (() => {
      const rawVatNumber = profile.vatNumber;
      return rawVatNumber || "";
    })(),
    entityType: (() => {
      const rawEntityType = profile.entityType;
      return rawEntityType || "";
    })(),
    streetAddress: (() => {
      const rawStreetAddress = profile.streetAddress;
      return rawStreetAddress || "";
    })(),
    city: (() => {
      const rawCity = profile.city;
      return rawCity || "";
    })(),
    province: (() => {
      const rawProvince = profile.province;
      return rawProvince || "";
    })(),
    postalCode: (() => {
      const rawPostalCode = profile.postalCode;
      return rawPostalCode || "";
    })(),
    country: profile.country,
    phone: (() => {
      const rawPhone = profile.phone;
      return rawPhone || "";
    })(),
    generalEmail: (() => {
      const rawGeneralEmail = profile.generalEmail;
      return rawGeneralEmail || "";
    })(),
    supportEmail: (() => {
      const rawSupportEmail = profile.supportEmail;
      return rawSupportEmail || "";
    })(),
    privacyEmail: (() => {
      const rawPrivacyEmail = profile.privacyEmail;
      return rawPrivacyEmail || "";
    })(),
    websiteUrl: (() => {
      const rawWebsiteUrl = profile.websiteUrl;
      return rawWebsiteUrl || "";
    })(),
    informationOfficerName: (() => {
      const rawInformationOfficerName = profile.informationOfficerName;
      return rawInformationOfficerName || "";
    })(),
    informationOfficerEmail: (() => {
      const rawInformationOfficerEmail = profile.informationOfficerEmail;
      return rawInformationOfficerEmail || "";
    })(),
    jurisdiction: profile.jurisdiction,
    primaryDomain: (() => {
      const rawPrimaryDomain = profile.primaryDomain;
      return rawPrimaryDomain || "";
    })(),
    noReplyEmail: (() => {
      const rawNoReplyEmail = profile.noReplyEmail;
      return rawNoReplyEmail || "";
    })(),
    mailerName: (() => {
      const rawMailerName = profile.mailerName;
      return rawMailerName || "";
    })(),
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
          value={(() => {
            const rawLegalName = form.legalName;
            return rawLegalName || "";
          })()}
          onChange={updateField("legalName")}
        />
        <Field
          label="Trading Name"
          value={(() => {
            const rawTradingName = form.tradingName;
            return rawTradingName || "";
          })()}
          onChange={updateField("tradingName")}
        />
        <Field
          label="Registration Number"
          value={(() => {
            const rawRegistrationNumber = form.registrationNumber;
            return rawRegistrationNumber || "";
          })()}
          onChange={updateField("registrationNumber")}
        />
        <Field
          label="VAT Number"
          value={(() => {
            const rawVatNumber = form.vatNumber;
            return rawVatNumber || "";
          })()}
          onChange={updateField("vatNumber")}
        />
        <Field
          label="Entity Type"
          value={(() => {
            const rawEntityType = form.entityType;
            return rawEntityType || "";
          })()}
          onChange={updateField("entityType")}
          placeholder="e.g. Private Company (Pty) Ltd"
        />
      </SectionCard>

      <SectionCard title="Contact Details">
        <div className="md:col-span-2">
          <Field
            label="Street Address"
            value={(() => {
              const rawStreetAddress = form.streetAddress;
              return rawStreetAddress || "";
            })()}
            onChange={updateField("streetAddress")}
          />
        </div>
        <Field
          label="City"
          value={(() => {
            const rawCity = form.city;
            return rawCity || "";
          })()}
          onChange={updateField("city")}
        />
        <Field
          label="Province"
          value={(() => {
            const rawProvince = form.province;
            return rawProvince || "";
          })()}
          onChange={updateField("province")}
        />
        <Field
          label="Postal Code"
          value={(() => {
            const rawPostalCode = form.postalCode;
            return rawPostalCode || "";
          })()}
          onChange={updateField("postalCode")}
        />
        <Field
          label="Country"
          value={(() => {
            const rawCountry = form.country;
            return rawCountry || "";
          })()}
          onChange={updateField("country")}
        />
        <Field
          label="Phone"
          value={(() => {
            const rawPhone = form.phone;
            return rawPhone || "";
          })()}
          onChange={updateField("phone")}
          type="tel"
        />
        <Field
          label="Website URL"
          value={(() => {
            const rawWebsiteUrl = form.websiteUrl;
            return rawWebsiteUrl || "";
          })()}
          onChange={updateField("websiteUrl")}
          type="url"
        />
        <Field
          label="General Email"
          value={(() => {
            const rawGeneralEmail = form.generalEmail;
            return rawGeneralEmail || "";
          })()}
          onChange={updateField("generalEmail")}
          type="email"
        />
        <Field
          label="Support Email"
          value={(() => {
            const rawSupportEmail = form.supportEmail;
            return rawSupportEmail || "";
          })()}
          onChange={updateField("supportEmail")}
          type="email"
        />
        <Field
          label="Privacy Email"
          value={(() => {
            const rawPrivacyEmail = form.privacyEmail;
            return rawPrivacyEmail || "";
          })()}
          onChange={updateField("privacyEmail")}
          type="email"
        />
      </SectionCard>

      <SectionCard title="Legal & Compliance">
        <Field
          label="Information Officer Name"
          value={(() => {
            const rawInformationOfficerName = form.informationOfficerName;
            return rawInformationOfficerName || "";
          })()}
          onChange={updateField("informationOfficerName")}
        />
        <Field
          label="Information Officer Email"
          value={(() => {
            const rawInformationOfficerEmail = form.informationOfficerEmail;
            return rawInformationOfficerEmail || "";
          })()}
          onChange={updateField("informationOfficerEmail")}
          type="email"
        />
        <Field
          label="Jurisdiction"
          value={(() => {
            const rawJurisdiction = form.jurisdiction;
            return rawJurisdiction || "";
          })()}
          onChange={updateField("jurisdiction")}
        />
      </SectionCard>

      <SectionCard title="Email Configuration">
        <Field
          label="Primary Domain"
          value={(() => {
            const rawPrimaryDomain = form.primaryDomain;
            return rawPrimaryDomain || "";
          })()}
          onChange={updateField("primaryDomain")}
          placeholder="e.g. annix.co.za"
        />
        <Field
          label="No-Reply Email"
          value={(() => {
            const rawNoReplyEmail = form.noReplyEmail;
            return rawNoReplyEmail || "";
          })()}
          onChange={updateField("noReplyEmail")}
          type="email"
        />
        <Field
          label="Mailer Name"
          value={(() => {
            const rawMailerName = form.mailerName;
            return rawMailerName || "";
          })()}
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
