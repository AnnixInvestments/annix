import { ForbiddenException } from "@nestjs/common";
import {
  ANNIX_ORBIT_STUDENT_FEATURES,
  type AnnixOrbitStudentFeatureKey,
} from "./annix-orbit-student-licensing";

// FuturePath guardian-consent gate — SCAFFOLD for the unbuilt Student module
// (issue #398 finding 9). MENTOR delivers AI study guidance to students who may be
// minors, so it must never be served without a recorded parent/guardian consent.
// When the Student module is built it captures a StudentGuardianConsent at
// registration / first MENTOR use and calls assertStudentGuardianConsentForFeature
// before any AI-guidance response. The assertion is fail-closed so a MENTOR route
// cannot ship without satisfying it.

export const GUARDIAN_CONSENT_GATED_FEATURES: readonly AnnixOrbitStudentFeatureKey[] = [
  ANNIX_ORBIT_STUDENT_FEATURES.MENTOR,
];

export function featureRequiresGuardianConsent(feature: AnnixOrbitStudentFeatureKey): boolean {
  return GUARDIAN_CONSENT_GATED_FEATURES.includes(feature);
}

export type StudentMinorStatus = "minor" | "adult" | "unknown";
export type GuardianConsentMethod = "in_app" | "email" | "document" | "whatsapp";

export interface StudentGuardianConsent {
  minorStatus: StudentMinorStatus;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianContact: string | null;
  consentMethod: GuardianConsentMethod | null;
  consentGivenAt: Date | null;
}

export const STUDENT_GUARDIAN_CONSENT_REQUIRED_CODE = "student_guardian_consent_required";

export function studentGuardianConsentSatisfied(consent: StudentGuardianConsent | null): boolean {
  if (consent == null) {
    return false;
  }
  if (consent.minorStatus === "adult") {
    return true;
  }
  return consent.consentGivenAt != null && consent.guardianName != null;
}

export function assertStudentGuardianConsentForFeature(
  feature: AnnixOrbitStudentFeatureKey,
  consent: StudentGuardianConsent | null,
): void {
  if (!featureRequiresGuardianConsent(feature)) {
    return;
  }
  if (studentGuardianConsentSatisfied(consent)) {
    return;
  }
  throw new ForbiddenException({
    message:
      "AI study guidance needs a parent or guardian's consent before it can be used. Please complete the guardian consent step to continue.",
    code: STUDENT_GUARDIAN_CONSENT_REQUIRED_CODE,
  });
}
