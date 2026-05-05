import {
  OptionalString,
  RequiredBoolean,
  RequiredIn,
  RequiredStringArray,
} from "../../lib/dto/validation-decorators";

export const EE_POPULATION_GROUP_VALUES = [
  "african_black",
  "coloured",
  "indian",
  "white",
  "prefer_not_to_say",
] as const;

export const EE_GENDER_VALUES = ["female", "male", "other", "prefer_not_to_say"] as const;

export const EE_DISABILITY_VALUES = ["yes", "no", "prefer_not_to_say"] as const;

export const EE_NATIONALITY_VALUES = [
  "sa_citizen",
  "sa_permanent_resident",
  "foreign_national",
  "prefer_not_to_say",
] as const;

export const EE_PURPOSE_VALUES = ["ee_reporting", "fairness_monitoring"] as const;

export class SubmitEeDisclosureDto {
  @RequiredIn(EE_POPULATION_GROUP_VALUES)
  populationGroup: (typeof EE_POPULATION_GROUP_VALUES)[number];

  @RequiredIn(EE_GENDER_VALUES)
  gender: (typeof EE_GENDER_VALUES)[number];

  @RequiredIn(EE_DISABILITY_VALUES)
  disabilityStatus: (typeof EE_DISABILITY_VALUES)[number];

  @RequiredBoolean()
  requiresAccommodation: boolean;

  @OptionalString({ maxLength: 2000 })
  accommodationNotes: string | null;

  @RequiredIn(EE_NATIONALITY_VALUES)
  nationalityStatus: (typeof EE_NATIONALITY_VALUES)[number];

  @RequiredStringArray()
  purposes: Array<(typeof EE_PURPOSE_VALUES)[number]>;
}
