import {
  OptionalInt,
  OptionalString,
  RequiredIn,
  RequiredInt,
  RequiredNumber,
  RequiredString,
} from "../../lib/dto/validation-decorators";

export const EE_TARGET_METRIC_VALUES = [
  "race_african_black",
  "race_coloured",
  "race_indian",
  "female",
  "disability",
] as const;

export const EE_TARGET_LEVEL_VALUES = [
  "top_management",
  "senior_management",
  "professionally_qualified",
  "skilled",
  "semi_skilled",
  "unskilled",
  "all_levels",
] as const;

export class UpsertEeTargetDto {
  @OptionalInt()
  id: number | null;

  @RequiredString({ maxLength: 100 })
  sectorCode: string;

  @RequiredIn(EE_TARGET_LEVEL_VALUES)
  occupationalLevel: (typeof EE_TARGET_LEVEL_VALUES)[number];

  @RequiredInt({ min: 2025, max: 2099 })
  targetYear: number;

  @RequiredIn(EE_TARGET_METRIC_VALUES)
  targetMetric: (typeof EE_TARGET_METRIC_VALUES)[number];

  @RequiredNumber({ min: 0, max: 100 })
  targetPercent: number;

  @OptionalString({ maxLength: 255 })
  gazetteReference: string | null;
}
