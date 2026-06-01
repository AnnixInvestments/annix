import { isArray } from "es-toolkit/compat";
import type {
  EeDisabilityKey,
  EeGenderKey,
  EePopulationGroupKey,
  MySeekerEeAttributes,
} from "@/app/lib/api/annixOrbitApi";

export type EeNationalityKey = MySeekerEeAttributes["nationalityStatus"];
export type EePurposeKey = "ee_reporting" | "fairness_monitoring";

export const POPULATION_OPTIONS: Array<{ value: EePopulationGroupKey; label: string }> = [
  { value: "african_black", label: "African / Black" },
  { value: "coloured", label: "Coloured" },
  { value: "indian", label: "Indian / Asian" },
  { value: "white", label: "White" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const GENDER_OPTIONS: Array<{ value: EeGenderKey; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const DISABILITY_OPTIONS: Array<{ value: EeDisabilityKey; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const NATIONALITY_OPTIONS: Array<{ value: EeNationalityKey; label: string }> = [
  { value: "sa_citizen", label: "South African citizen" },
  { value: "sa_permanent_resident", label: "South African permanent resident" },
  { value: "foreign_national", label: "Foreign national" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export interface EeDisclosureFormState {
  populationGroup: EePopulationGroupKey;
  gender: EeGenderKey;
  disabilityStatus: EeDisabilityKey;
  requiresAccommodation: boolean;
  accommodationNotes: string;
  nationalityStatus: EeNationalityKey;
  eeReporting: boolean;
  fairnessMonitoring: boolean;
}

export const DEFAULT_EE_FORM_STATE: EeDisclosureFormState = {
  populationGroup: "prefer_not_to_say",
  gender: "prefer_not_to_say",
  disabilityStatus: "prefer_not_to_say",
  requiresAccommodation: false,
  accommodationNotes: "",
  nationalityStatus: "prefer_not_to_say",
  eeReporting: true,
  fairnessMonitoring: true,
};

export function eeFormStateFromAttributes(data: MySeekerEeAttributes): EeDisclosureFormState {
  const populationGroup = data.populationGroup;
  const gender = data.gender;
  const disabilityStatus = data.disabilityStatus;
  const nationalityStatus = data.nationalityStatus;
  const accommodationNotes = data.accommodationNotes;
  const rawPurposes = data.purposes;
  const purposes = isArray(rawPurposes) ? rawPurposes : [];
  return {
    populationGroup: populationGroup || "prefer_not_to_say",
    gender: gender || "prefer_not_to_say",
    disabilityStatus: disabilityStatus || "prefer_not_to_say",
    requiresAccommodation: data.requiresAccommodation === true,
    accommodationNotes: accommodationNotes || "",
    nationalityStatus: nationalityStatus || "prefer_not_to_say",
    eeReporting: purposes.includes("ee_reporting"),
    fairnessMonitoring: purposes.includes("fairness_monitoring"),
  };
}

export function eePurposesFromState(state: EeDisclosureFormState): EePurposeKey[] {
  const purposes: EePurposeKey[] = [];
  if (state.eeReporting) purposes.push("ee_reporting");
  if (state.fairnessMonitoring) purposes.push("fairness_monitoring");
  return purposes;
}
