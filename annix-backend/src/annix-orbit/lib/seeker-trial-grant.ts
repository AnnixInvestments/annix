import { BadRequestException } from "@nestjs/common";

export const MAX_TRIAL_DAYS = 30;

export function clampTrialDays(trialDays: number | null): number | null {
  if (trialDays === null) {
    return null;
  }
  if (!Number.isFinite(trialDays) || !Number.isInteger(trialDays) || trialDays <= 0) {
    throw new BadRequestException("Trial days must be a positive whole number.");
  }
  return Math.min(trialDays, MAX_TRIAL_DAYS);
}

export function assertTrialDaysWithinCeiling(trialDays: number): number {
  if (!Number.isFinite(trialDays) || !Number.isInteger(trialDays) || trialDays <= 0) {
    throw new BadRequestException("Trial days must be a positive whole number.");
  }
  if (trialDays > MAX_TRIAL_DAYS) {
    throw new BadRequestException(`Trial days may not exceed ${MAX_TRIAL_DAYS}.`);
  }
  return trialDays;
}
