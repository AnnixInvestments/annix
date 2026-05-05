import {
  OptionalString,
  RequiredBoolean,
  RequiredIn,
  RequiredInt,
  RequiredStringArray,
} from "../../lib/dto/validation-decorators";
import {
  EE_DISABILITY_VALUES,
  EE_GENDER_VALUES,
  EE_NATIONALITY_VALUES,
  EE_POPULATION_GROUP_VALUES,
  EE_PURPOSE_VALUES,
} from "./ee-disclosure.dto";

export class UpdateSeekerEeAttributesDto {
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

  @RequiredInt({ min: 1 })
  consentTextVersionId: number;

  @RequiredStringArray()
  purposes: Array<(typeof EE_PURPOSE_VALUES)[number]>;
}
