import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AnnixOrbitEeConsentTextVersion } from "../../annix-orbit/entities/annix-orbit-ee-consent-text-version.entity";
import { fromISO, now } from "../../lib/datetime";
import {
  ORBIT_EDUCATION_ACTIVE_JURISDICTIONS,
  ORBIT_EDUCATION_MINOR_AGE_THRESHOLD,
  type OrbitEducationConsentRole,
  type OrbitEducationJurisdiction,
} from "../annix-orbit-education.constants";
import { EducationConsent } from "../entities/education-consent.entity";
import { EducationProfile } from "../entities/education-profile.entity";

/** Country → consent jurisdiction. POPIA + GDPR live (D4); US (FERPA/COPPA) is
 *  slot-ready but NOT active, so US profiles fall back to POPIA processing rules
 *  and US minors must not be onboarded until FERPA/COPPA flows exist. */
const COUNTRY_JURISDICTION: Record<string, OrbitEducationJurisdiction> = {
  ZA: "POPIA",
  GB: "GDPR",
  UK: "GDPR",
  IE: "GDPR",
};

@Injectable()
export class EducationConsentService {
  private readonly logger = new Logger(EducationConsentService.name);

  constructor(
    @InjectRepository(EducationConsent)
    private readonly consentRepo: Repository<EducationConsent>,
    @InjectRepository(AnnixOrbitEeConsentTextVersion)
    private readonly consentTextVersionRepo: Repository<AnnixOrbitEeConsentTextVersion>,
  ) {}

  jurisdictionForCountry(country: string | null): OrbitEducationJurisdiction {
    if (!country) return "POPIA";
    const mapped = COUNTRY_JURISDICTION[country.toUpperCase()];
    return mapped ?? "POPIA";
  }

  ageInYears(dateOfBirth: string | null): number | null {
    if (!dateOfBirth) return null;
    const dob = fromISO(dateOfBirth);
    if (!dob.isValid) return null;
    return Math.floor(now().diff(dob, "years").years);
  }

  isMinor(profile: EducationProfile): boolean {
    const age = this.ageInYears(profile.dateOfBirth);
    if (age === null) return true; // unknown DOB → treat as minor (safer default)
    const jurisdiction = (profile.jurisdiction as OrbitEducationJurisdiction) ?? "POPIA";
    const threshold = ORBIT_EDUCATION_MINOR_AGE_THRESHOLD[jurisdiction] ?? 18;
    return age < threshold;
  }

  async hasValidConsent(educationProfileId: string): Promise<boolean> {
    const active = await this.consentRepo.findOne({
      where: { educationProfileId, revokedAt: IsNull() },
    });
    return active != null;
  }

  /**
   * Guardian-consent gate: a minor's profile may not be processed without a
   * valid (non-revoked) consent row. Adults pass through. Throws 403 otherwise.
   */
  async assertProcessingAllowed(profile: EducationProfile): Promise<void> {
    if (!this.isMinor(profile)) return;
    const consented = await this.hasValidConsent(profile.id);
    if (!consented) {
      throw new ForbiddenException(
        "A guardian must record consent before this learner's profile can be processed.",
      );
    }
  }

  async recordConsent(input: {
    educationProfileId: string;
    grantedByUserId: number;
    grantedByRole: OrbitEducationConsentRole;
    jurisdiction: OrbitEducationJurisdiction;
  }): Promise<EducationConsent> {
    if (!ORBIT_EDUCATION_ACTIVE_JURISDICTIONS.includes(input.jurisdiction)) {
      throw new ForbiddenException(
        `Consent under ${input.jurisdiction} is not yet supported — only POPIA and GDPR are active.`,
      );
    }
    const textVersion = await this.activeConsentTextVersion();
    const saved = await this.consentRepo.save(
      this.consentRepo.create({
        educationProfileId: input.educationProfileId,
        consentTextVersionId: textVersion ? textVersion.id : null,
        jurisdiction: input.jurisdiction,
        grantedByUserId: input.grantedByUserId,
        grantedByRole: input.grantedByRole,
        grantedAt: now().toJSDate(),
      }),
    );
    this.logger.log(
      `Recorded ${input.jurisdiction} consent for education profile ${input.educationProfileId}`,
    );
    return saved;
  }

  async revokeConsent(educationProfileId: string): Promise<number> {
    const result = await this.consentRepo.update(
      { educationProfileId, revokedAt: IsNull() },
      { revokedAt: now().toJSDate() },
    );
    return result.affected ?? 0;
  }

  private async activeConsentTextVersion(): Promise<AnnixOrbitEeConsentTextVersion | null> {
    return this.consentTextVersionRepo.findOne({
      where: { effectiveTo: IsNull() },
      order: { effectiveFrom: "DESC" },
    });
  }
}
