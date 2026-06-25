import {
  assertStudentGuardianConsentForFeature,
  featureRequiresGuardianConsent,
  STUDENT_GUARDIAN_CONSENT_REQUIRED_CODE,
  type StudentGuardianConsent,
  studentGuardianConsentSatisfied,
} from "./annix-orbit-student-consent";
import { ANNIX_ORBIT_STUDENT_FEATURES } from "./annix-orbit-student-licensing";

const consent = (overrides: Partial<StudentGuardianConsent> = {}): StudentGuardianConsent => ({
  minorStatus: "minor",
  guardianName: "A. Guardian",
  guardianRelationship: "parent",
  guardianContact: "+27 11 000 0000",
  consentMethod: "in_app",
  consentGivenAt: new Date(1_700_000_000_000),
  ...overrides,
});

describe("FuturePath guardian-consent scaffold (issue #398 finding 9)", () => {
  it("gates only the AI study mentor feature", () => {
    expect(featureRequiresGuardianConsent(ANNIX_ORBIT_STUDENT_FEATURES.MENTOR)).toBe(true);
    expect(featureRequiresGuardianConsent(ANNIX_ORBIT_STUDENT_FEATURES.FUTUREPATH)).toBe(false);
    expect(featureRequiresGuardianConsent(ANNIX_ORBIT_STUDENT_FEATURES.SUBJECT_TRACKING)).toBe(
      false,
    );
  });

  it("treats a satisfied consent as valid and missing/invalid consent as not", () => {
    expect(studentGuardianConsentSatisfied(consent())).toBe(true);
    expect(
      studentGuardianConsentSatisfied(consent({ minorStatus: "adult", consentGivenAt: null })),
    ).toBe(true);
    expect(studentGuardianConsentSatisfied(null)).toBe(false);
    expect(studentGuardianConsentSatisfied(consent({ consentGivenAt: null }))).toBe(false);
    expect(
      studentGuardianConsentSatisfied(consent({ minorStatus: "unknown", guardianName: null })),
    ).toBe(false);
  });

  it("fail-closed: MENTOR with no/invalid guardian consent is rejected", () => {
    expect(() =>
      assertStudentGuardianConsentForFeature(ANNIX_ORBIT_STUDENT_FEATURES.MENTOR, null),
    ).toThrow(expect.objectContaining({ message: expect.any(String) }));

    try {
      assertStudentGuardianConsentForFeature(
        ANNIX_ORBIT_STUDENT_FEATURES.MENTOR,
        consent({ consentGivenAt: null }),
      );
      throw new Error("expected a rejection");
    } catch (error) {
      const response = (error as { getResponse?: () => unknown }).getResponse?.();
      expect(response).toMatchObject({ code: STUDENT_GUARDIAN_CONSENT_REQUIRED_CODE });
    }
  });

  it("allows MENTOR with a satisfied consent and never gates non-MENTOR features", () => {
    expect(() =>
      assertStudentGuardianConsentForFeature(ANNIX_ORBIT_STUDENT_FEATURES.MENTOR, consent()),
    ).not.toThrow();
    expect(() =>
      assertStudentGuardianConsentForFeature(ANNIX_ORBIT_STUDENT_FEATURES.FUTUREPATH, null),
    ).not.toThrow();
  });
});
