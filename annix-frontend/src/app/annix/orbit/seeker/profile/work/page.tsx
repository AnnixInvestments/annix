"use client";

import {
  AVAILABILITY_LABELS,
  AVAILABILITY_VALUES,
  type Availability,
  emptyWorkProfile,
  JOB_CATEGORIES,
  type JobCategoryKey,
  TRAVEL_DISTANCE_RANGES,
  WORK_EXPERIENCE_RANGES,
  WORK_ROLE_SUGGESTIONS,
  type WorkProfile,
} from "@annix/product-data/sa-market";
import { isEqual } from "es-toolkit/compat";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitAutofillSeekerWorkProfile,
  useOrbitSeekerWorkProfile,
  useOrbitUpsertSeekerWorkProfile,
} from "@/app/lib/query/hooks";
import { formatCurrency } from "@/app/lib/utils/currency";

const GoogleMapLocationPicker = dynamic(() => import("@/app/components/GoogleMapLocationPicker"), {
  ssr: false,
  loading: () => <div className="w-full h-64 rounded-lg bg-gray-100 animate-pulse" />,
});

const rawMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_KEY = rawMapsKey || "";

export default function SeekerWorkProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const query = useOrbitSeekerWorkProfile();
  const mutation = useOrbitUpsertSeekerWorkProfile();
  const autofillMutation = useOrbitAutofillSeekerWorkProfile();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();

  const [profile, setProfile] = useState<WorkProfile>(emptyWorkProfile());
  const [formVersion, setFormVersion] = useState(0);
  const [roleSuggestionsOpen, setRoleSuggestionsOpen] = useState(false);
  const [showHomeLocationPicker, setShowHomeLocationPicker] = useState(false);
  const savedProfileRef = useRef<WorkProfile>(emptyWorkProfile());
  const salaryCautionShownRef = useRef(false);

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
  const roleValue = emptyIfNull(shared.primaryRole);
  const roleSuggestions = useMemo(() => {
    const queryText = String(roleValue).trim().toLowerCase();
    if (queryText.length < 2) {
      return WORK_ROLE_SUGGESTIONS.slice(0, 8);
    }
    return WORK_ROLE_SUGGESTIONS.filter((role) => role.toLowerCase().includes(queryText)).slice(
      0,
      8,
    );
  }, [roleValue]);
  const hasSkillsOrCertifications = shared.topSkills.length > 0 || shared.certifications.length > 0;

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
    const n = value.length > 0 ? Number.parseInt(value, 10) : Number.NaN;
    const clamped = Number.isFinite(n) ? n : null;
    setProfile({ ...profile, shared: { ...shared, yearsExperience: clamped } });
  };

  const updateTravel = (value: string) => {
    const n = value.length > 0 ? Number.parseInt(value, 10) : Number.NaN;
    const clamped = Number.isFinite(n) ? n : null;
    setProfile({ ...profile, shared: { ...shared, willingToTravelKm: clamped } });
  };

  const updateHomeAddress = (value: string) => {
    const trimmed = value.length === 0 ? null : value;
    setProfile({ ...profile, shared: { ...shared, homeAddress: trimmed } });
  };

  const updateHomeLocation = (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string },
  ) => {
    const selectedAddress = addressComponents ? addressComponents.address : null;
    const currentHomeAddress = shared.homeAddress;
    const homeAddress =
      selectedAddress !== null && selectedAddress !== undefined
        ? selectedAddress
        : currentHomeAddress !== null && currentHomeAddress !== undefined
          ? currentHomeAddress
          : null;
    setProfile({
      ...profile,
      shared: {
        ...shared,
        homeAddress,
        homeLatitude: location.lat,
        homeLongitude: location.lng,
      },
    });
    setShowHomeLocationPicker(false);
  };

  const clearHomeLocation = () => {
    setProfile({
      ...profile,
      shared: {
        ...shared,
        homeAddress: null,
        homeLatitude: null,
        homeLongitude: null,
      },
    });
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

  const showSalaryCaution = async () => {
    if (salaryCautionShownRef.current) return;
    salaryCautionShownRef.current = true;
    await confirm({
      title: "Salary matching note",
      message:
        "Not all job listings include salary information in the title or listing data. If you set a salary range, some returned jobs may still be below your expected salary because the source did not publish enough salary detail.",
      confirmLabel: "I understand",
      cancelLabel: "Close",
      variant: "warning",
    });
  };

  const updateSalaryMin = (value: string) => {
    void showSalaryCaution();
    const n = Number.parseInt(value, 10);
    const clamped = Number.isFinite(n) && n >= 0 ? n : null;
    setProfile({ ...profile, shared: { ...shared, expectedSalaryMin: clamped } });
  };

  const updateSalaryMax = (value: string) => {
    void showSalaryCaution();
    const n = Number.parseInt(value, 10);
    const clamped = Number.isFinite(n) && n >= 0 ? n : null;
    setProfile({ ...profile, shared: { ...shared, expectedSalaryMax: clamped } });
  };

  const applySalarySuggestion = async (min: number | null, max: number | null) => {
    await showSalaryCaution();
    setProfile({
      ...profile,
      shared: { ...shared, expectedSalaryMin: min, expectedSalaryMax: max },
    });
  };

  const handleSave = () => {
    const snapshot = profile;
    mutation.mutate(snapshot, {
      onSuccess: () => {
        savedProfileRef.current = snapshot;
        showToast("Work profile saved", "success");
        router.push("/annix/orbit/seeker/dashboard");
      },
      onError: () => alert({ message: "Could not save work profile", variant: "error" }),
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
          alert({
            message: "Auto-fill couldn't read your CV — fill in the form manually",
            variant: "error",
          });
        }
      },
      onError: () => {
        hideExtraction();
        if (!nonDestructive) {
          alert({ message: "Auto-fill failed — fill in the form manually", variant: "error" });
        }
      },
    });
  };

  const handleAutofill = () => {
    void runAutofill(false);
  };

  const handleSkillsAutofill = () => {
    showExtraction({
      brand: "annix-orbit",
      label: "Nix is reading your CV for skills and certifications…",
      estimatedDurationMs: 12000,
    });
    autofillMutation.mutate(undefined, {
      onSuccess: (result) => {
        hideExtraction();
        if (result.extracted) {
          setProfile((prev) => ({
            ...prev,
            shared: {
              ...prev.shared,
              topSkills: result.profile.shared.topSkills,
              certifications: result.profile.shared.certifications,
            },
          }));
          setFormVersion((v) => v + 1);
          showToast("Skills and certifications refreshed from your CV", "success");
          return;
        }
        const reason = result.reason;
        if (reason === "no-cv-text" || reason === "no-candidate") {
          showToast("Upload and analyse your CV first", "info");
          router.push("/annix/orbit/seeker/profile#cv-section");
          return;
        }
        alert({
          message: "Nix couldn't read skills from your CV — try the CV Wizard first",
          variant: "error",
        });
        router.push("/annix/orbit/seeker/profile#nix-section");
      },
      onError: () => {
        hideExtraction();
        alert({ message: "Could not refresh skills from your CV", variant: "error" });
      },
    });
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
  const salaryMinValue = emptyIfNull(shared.expectedSalaryMin);
  const salaryMaxValue = emptyIfNull(shared.expectedSalaryMax);
  const savedHomeLatitude = shared.homeLatitude;
  const savedHomeLongitude = shared.homeLongitude;
  const homeLat = savedHomeLatitude === undefined ? null : savedHomeLatitude;
  const homeLng = savedHomeLongitude === undefined ? null : savedHomeLongitude;
  const suggestedSalaryAnnualMin = queryData ? queryData.suggestedSalaryMin : null;
  const suggestedSalaryAnnualMax = queryData ? queryData.suggestedSalaryMax : null;
  // Nix's CV-derived suggestion is an annual figure; the profile is now captured
  // per month, so show + apply it divided into a per-month value.
  const suggestedSalaryMin =
    suggestedSalaryAnnualMin !== null ? Math.round(suggestedSalaryAnnualMin / 12) : null;
  const suggestedSalaryMax =
    suggestedSalaryAnnualMax !== null ? Math.round(suggestedSalaryAnnualMax / 12) : null;
  const hasSalarySuggestion = suggestedSalaryMin !== null || suggestedSalaryMax !== null;
  const salarySuggestionLabel = salaryBandLabel(suggestedSalaryMin, suggestedSalaryMax);
  const salaryMinPlaceholder =
    suggestedSalaryMin !== null ? randPlaceholder(suggestedSalaryMin) : "e.g. 25000";
  const salaryMaxPlaceholder =
    suggestedSalaryMax !== null ? randPlaceholder(suggestedSalaryMax) : "e.g. 45000";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Work profile</h1>
          <p className="text-sm text-white/70 mt-1">
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
          <label className="block sm:col-span-2 relative">
            <span className="text-sm text-gray-700">Primary role / job title</span>
            <input
              key={`role-${formVersion}`}
              type="text"
              value={roleValue}
              onFocus={() => setRoleSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setRoleSuggestionsOpen(false), 120)}
              onChange={(e) => {
                updatePrimaryRole(e.target.value);
                setRoleSuggestionsOpen(true);
              }}
              placeholder="e.g. Registered Nurse, Software Developer, Boilermaker"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {roleSuggestionsOpen && roleSuggestions.length > 0 ? (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                {roleSuggestions.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      updatePrimaryRole(role);
                      setRoleSuggestionsOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[var(--brand-navbar-50,#f0f0fc)] hover:text-[var(--brand-navbar,#323288)]"
                  >
                    {role}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Years of experience</span>
            <select
              value={yearsValue}
              onChange={(e) => updateYears(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Not specified</option>
              {WORK_EXPERIENCE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Willing to travel (km)</span>
            <select
              value={travelValue}
              onChange={(e) => updateTravel(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Not specified</option>
              {TRAVEL_DISTANCE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 space-y-2">
            <label className="block">
              <span className="text-sm text-gray-700">Home address</span>
              <input
                type="text"
                value={emptyIfNull(shared.homeAddress)}
                onChange={(e) => updateHomeAddress(e.target.value)}
                placeholder="Optional, used with your travel range"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {GOOGLE_MAPS_API_KEY ? (
                <button
                  type="button"
                  onClick={() => setShowHomeLocationPicker(true)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
                >
                  Pin home on map
                </button>
              ) : null}
              {homeLat !== null && homeLng !== null ? (
                <>
                  <span className="text-xs text-gray-500">
                    Pin: {homeLat.toFixed(5)}, {homeLng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={clearHomeLocation}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Clear pin
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-500">
                  Add a pin if you want travel distance matched from your home area.
                </span>
              )}
            </div>
          </div>
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Expected salary</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            The gross monthly salary range you're after, in Rand. We use this to match you to roles
            that pay in your range — leave it blank if you'd rather not say.
          </p>
        </div>
        {hasSalarySuggestion ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="flex-1 min-w-[12rem]">
              Based on your CV, Nix estimates someone with your experience could expect{" "}
              <strong>{salarySuggestionLabel}</strong> per month.
            </span>
            <button
              type="button"
              onClick={() => void applySalarySuggestion(suggestedSalaryMin, suggestedSalaryMax)}
              className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-200 text-amber-900 hover:bg-amber-300"
            >
              Use this range
            </button>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-700">Minimum (Rand / month)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={salaryMinValue}
              onChange={(e) => updateSalaryMin(e.target.value)}
              placeholder={salaryMinPlaceholder}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Maximum (Rand / month)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={salaryMaxValue}
              onChange={(e) => updateSalaryMax(e.target.value)}
              placeholder={salaryMaxPlaceholder}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Skills &amp; certifications</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              These can be filled from your analysed CV and refreshed after you improve it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSkillsAutofill}
              disabled={autofillMutation.isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
            >
              {autofillMutation.isPending ? "Reading CV…" : "Fill from CV"}
            </button>
            {!hasSkillsOrCertifications ? (
              <button
                type="button"
                onClick={() => router.push("/annix/orbit/seeker/profile#nix-section")}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Analyse CV
              </button>
            ) : null}
          </div>
        </div>
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
      {showHomeLocationPicker ? (
        <GoogleMapLocationPicker
          apiKey={GOOGLE_MAPS_API_KEY}
          initialLocation={
            homeLat !== null && homeLng !== null ? { lat: homeLat, lng: homeLng } : undefined
          }
          onLocationSelect={updateHomeLocation}
          onClose={() => setShowHomeLocationPicker(false)}
          config="responsive"
        />
      ) : null}
      {ConfirmDialog}
      {AlertDialog}
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

function randPlaceholder(amount: number): string {
  return `e.g. ${formatCurrency(amount)}`;
}

function salaryBandLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  if (min !== null) return `from ${formatCurrency(min)}`;
  if (max !== null) return `up to ${formatCurrency(max)}`;
  return "";
}

function mergeEmptyWorkProfile(current: WorkProfile, incoming: WorkProfile): WorkProfile {
  const c = current.shared;
  const i = incoming.shared;
  const role = c.primaryRole;
  const years = c.yearsExperience;
  const avail = c.availability;
  const travel = c.willingToTravelKm;
  const homeAddress = c.homeAddress;
  const homeLatitude = c.homeLatitude;
  const homeLongitude = c.homeLongitude;
  return {
    ...current,
    shared: {
      ...c,
      fields: c.fields.length > 0 ? c.fields : i.fields,
      primaryRole: role === null ? i.primaryRole : role,
      yearsExperience: years === null ? i.yearsExperience : years,
      availability: avail === null ? i.availability : avail,
      willingToTravelKm: travel === null ? i.willingToTravelKm : travel,
      homeAddress: homeAddress === null || homeAddress === undefined ? i.homeAddress : homeAddress,
      homeLatitude:
        homeLatitude === null || homeLatitude === undefined ? i.homeLatitude : homeLatitude,
      homeLongitude:
        homeLongitude === null || homeLongitude === undefined ? i.homeLongitude : homeLongitude,
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
