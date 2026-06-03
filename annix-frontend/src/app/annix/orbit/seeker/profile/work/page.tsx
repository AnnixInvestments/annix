"use client";

import {
  AVAILABILITY_LABELS,
  AVAILABILITY_VALUES,
  type Availability,
  emptyWorkProfile,
  JOB_CATEGORIES,
  type JobCategoryKey,
  type WorkProfile,
} from "@annix/product-data/sa-market";
import { isEqual } from "es-toolkit/compat";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitAutofillSeekerWorkProfile,
  useOrbitSeekerWorkProfile,
  useOrbitUpsertSeekerWorkProfile,
} from "@/app/lib/query/hooks";

export default function SeekerWorkProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const query = useOrbitSeekerWorkProfile();
  const mutation = useOrbitUpsertSeekerWorkProfile();
  const autofillMutation = useOrbitAutofillSeekerWorkProfile();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();

  const [profile, setProfile] = useState<WorkProfile>(emptyWorkProfile());
  const [formVersion, setFormVersion] = useState(0);
  const savedProfileRef = useRef<WorkProfile>(emptyWorkProfile());

  const queryData = query.data;
  const hydratedRef = useRef(false);
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const profileData = queryData?.profile;
    if (profileData) {
      setProfile(profileData);
      savedProfileRef.current = profileData;
      hydratedRef.current = true;
    }
  }, [queryData]);

  const isDirty = !isEqual(profile, savedProfileRef.current);
  const shared = profile.shared;

  const toggleField = (key: JobCategoryKey) => {
    const current = shared.fields;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setProfile({ ...profile, shared: { ...shared, fields: next } });
  };

  const updatePrimaryRole = (value: string) => {
    const trimmed = value.length === 0 ? null : value;
    setProfile({ ...profile, shared: { ...shared, primaryRole: trimmed } });
  };

  const updateYears = (value: string) => {
    const n = Number.parseInt(value, 10);
    const clamped = Number.isFinite(n) ? Math.min(60, Math.max(0, n)) : null;
    setProfile({ ...profile, shared: { ...shared, yearsExperience: clamped } });
  };

  const updateTravel = (value: string) => {
    const n = Number.parseInt(value, 10);
    const clamped = Number.isFinite(n) ? Math.min(2000, Math.max(0, n)) : null;
    setProfile({ ...profile, shared: { ...shared, willingToTravelKm: clamped } });
  };

  const updateAvailability = (value: string) => {
    const candidate = value as Availability;
    setProfile({
      ...profile,
      shared: {
        ...shared,
        availability: AVAILABILITY_VALUES.includes(candidate) ? candidate : null,
      },
    });
  };

  const updateSkills = (value: string) => {
    setProfile({ ...profile, shared: { ...shared, topSkills: csvToArray(value) } });
  };

  const updateCertifications = (value: string) => {
    setProfile({ ...profile, shared: { ...shared, certifications: csvToArray(value) } });
  };

  const handleSave = () => {
    const snapshot = profile;
    mutation.mutate(snapshot, {
      onSuccess: () => {
        savedProfileRef.current = snapshot;
        showToast("Work profile saved", "success");
        router.push("/annix/orbit/seeker/dashboard");
      },
      onError: () => showToast("Could not save work profile", "error"),
    });
  };

  const runAutofill = async (nonDestructive: boolean) => {
    if (!nonDestructive && isDirty) {
      const proceed = await confirm({
        title: "Replace your work details?",
        message:
          "Auto-fill overwrites the details on this page with what Nix reads from your CV. Your unsaved changes here will be lost.",
        confirmLabel: "Replace with CV data",
        variant: "warning",
      });
      if (!proceed) return;
    }
    const stats = await metricsApi
      .extractionStats("orbit-work-extract", "cv-autofill")
      .catch(() => null);
    const averageMs = stats?.averageMs;
    const estimatedDurationMs = averageMs || 12000;
    showExtraction({
      brand: "annix-orbit",
      label: nonDestructive
        ? "Nix is reading your CV to fill in your skills…"
        : "Nix is reading your CV for your work profile…",
      estimatedDurationMs,
    });
    autofillMutation.mutate(undefined, {
      onSuccess: (result) => {
        hideExtraction();
        if (result.extracted) {
          if (nonDestructive) {
            setProfile((prev) => mergeEmptyWorkProfile(prev, result.profile));
          } else {
            setProfile(result.profile);
          }
          setFormVersion((v) => v + 1);
          const message = nonDestructive
            ? "Filled in the empty fields from your CV — review and save"
            : "Work profile auto-filled from your CV — review and save";
          showToast(message, "success");
          return;
        }
        if (nonDestructive) return;
        const reason = result.reason;
        if (reason === "no-cv-text") {
          showToast("Upload a CV first so we can read your work history", "info");
        } else if (reason === "no-candidate") {
          showToast("Upload a CV first", "info");
        } else {
          showToast("Auto-fill couldn't read your CV — fill in the form manually", "error");
        }
      },
      onError: () => {
        hideExtraction();
        if (!nonDestructive) {
          showToast("Auto-fill failed — fill in the form manually", "error");
        }
      },
    });
  };

  const handleAutofill = () => {
    void runAutofill(false);
  };

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (autoTriedRef.current) return;
    const s = savedProfileRef.current.shared;
    if (s.topSkills.length > 0 || s.certifications.length > 0) return;
    autoTriedRef.current = true;
    if (readWorkAutofillTried()) return;
    writeWorkAutofillTried();
    void runAutofill(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryData]);

  if (query.isLoading) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  if (query.isError) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your work profile right now. Please refresh the page.
        </div>
      </div>
    );
  }

  const yearsValue = emptyIfNull(shared.yearsExperience);
  const travelValue = emptyIfNull(shared.willingToTravelKm);
  const availabilityValue = emptyIfNull(shared.availability);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work profile</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tell us about your field, role and skills — across any industry. This sharpens the job
            matches the CV embedding can't infer on its own.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAutofill}
          disabled={autofillMutation.isPending}
          className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
        >
          {autofillMutation.isPending ? "Reading CV…" : "Auto-fill from my CV"}
        </button>
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your field(s)</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Pick the industries you work in. Choose one or a few — this focuses your matches.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {JOB_CATEGORIES.map((category) => {
            const checked = shared.fields.includes(category.key);
            return (
              <label
                key={category.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                  checked
                    ? "border-[var(--brand-navbar,#323288)] bg-[var(--brand-navbar-50,#f0f0fc)] text-[var(--brand-navbar,#323288)]"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(category.key)}
                  className="rounded"
                />
                {category.label}
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">About your work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Primary role / job title</span>
            <input
              key={`role-${formVersion}`}
              type="text"
              defaultValue={emptyIfNull(shared.primaryRole)}
              onChange={(e) => updatePrimaryRole(e.target.value)}
              placeholder="e.g. Registered Nurse, Software Developer, Boilermaker"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Years of experience</span>
            <input
              type="number"
              min={0}
              max={60}
              value={yearsValue}
              onChange={(e) => updateYears(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Willing to travel (km)</span>
            <input
              type="number"
              min={0}
              max={2000}
              value={travelValue}
              onChange={(e) => updateTravel(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-gray-700">Availability</span>
            <select
              value={availabilityValue}
              onChange={(e) => updateAvailability(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Not specified</option>
              {AVAILABILITY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {AVAILABILITY_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Skills &amp; certifications</h2>
        <label className="block">
          <span className="text-sm text-gray-700">Top skills (comma-separated)</span>
          <input
            key={`skills-${formVersion}`}
            type="text"
            defaultValue={shared.topSkills.join(", ")}
            onChange={(e) => updateSkills(e.target.value)}
            placeholder="e.g. Patient care, Excel, TypeScript, Welding"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">
            Certifications &amp; licences (comma-separated)
          </span>
          <input
            key={`certs-${formVersion}`}
            type="text"
            defaultValue={shared.certifications.join(", ")}
            onChange={(e) => updateCertifications(e.target.value)}
            placeholder="e.g. Red Seal, SANC registration, CompTIA A+, Code 14"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </label>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save work profile"}
        </button>
      </div>
      {ConfirmDialog}
    </div>
  );
}

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function emptyIfNull<T>(value: T | null | undefined): T | "" {
  return value == null ? "" : value;
}

function mergeEmptyWorkProfile(current: WorkProfile, incoming: WorkProfile): WorkProfile {
  const c = current.shared;
  const i = incoming.shared;
  const role = c.primaryRole;
  const years = c.yearsExperience;
  const avail = c.availability;
  const travel = c.willingToTravelKm;
  return {
    ...current,
    shared: {
      ...c,
      fields: c.fields.length > 0 ? c.fields : i.fields,
      primaryRole: role === null ? i.primaryRole : role,
      yearsExperience: years === null ? i.yearsExperience : years,
      availability: avail === null ? i.availability : avail,
      willingToTravelKm: travel === null ? i.willingToTravelKm : travel,
      topSkills: c.topSkills.length > 0 ? c.topSkills : i.topSkills,
      certifications: c.certifications.length > 0 ? c.certifications : i.certifications,
    },
  };
}

const WORK_AUTOFILL_TRIED_KEY = "orbit-work-autofill-tried";

function readWorkAutofillTried(): boolean {
  try {
    return sessionStorage.getItem(WORK_AUTOFILL_TRIED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeWorkAutofillTried(): void {
  try {
    sessionStorage.setItem(WORK_AUTOFILL_TRIED_KEY, "1");
  } catch {
    return;
  }
}
