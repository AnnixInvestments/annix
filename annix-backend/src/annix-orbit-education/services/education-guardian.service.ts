import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AcademicResult } from "../entities/academic-result.entity";
import { EducationApplication } from "../entities/education-application.entity";
import { EducationProfile } from "../entities/education-profile.entity";
import { GuardianLink } from "../entities/guardian-link.entity";
import { EducationConsentService } from "./education-consent.service";

export interface GuardianLinkedStudent {
  linkId: string;
  status: string;
  educationProfileId: string;
  studentName: string | null;
  curriculum: string;
  school: string | null;
  isMinor: boolean;
  consentRequired: boolean;
  resultsCount: number;
  applicationsCount: number;
}

/**
 * Parent/guardian dashboard (#304 Phase 2) over the Phase 0 guardian links. A
 * logged-in guardian sees the learners they're linked to (matched by their
 * accepted user id OR their invited email), can accept a pending invite, and
 * can record consent for a linked minor — reusing the consent service. Strictly
 * scoped: a guardian only ever sees/acts on links that are theirs.
 */
@Injectable()
export class EducationGuardianService {
  constructor(
    @InjectRepository(GuardianLink)
    private readonly guardianLinkRepo: Repository<GuardianLink>,
    @InjectRepository(EducationProfile)
    private readonly profileRepo: Repository<EducationProfile>,
    @InjectRepository(AcademicResult)
    private readonly resultRepo: Repository<AcademicResult>,
    @InjectRepository(EducationApplication)
    private readonly applicationRepo: Repository<EducationApplication>,
    private readonly consentService: EducationConsentService,
  ) {}

  private async linksFor(userId: number, email: string): Promise<GuardianLink[]> {
    const normalisedEmail = email.trim().toLowerCase();
    const links = await this.guardianLinkRepo.find({ order: { invitedAt: "DESC" } });
    return links.filter((link) => {
      if (link.status === "declined" || link.status === "revoked") return false;
      if (link.guardianUserId === userId) return true;
      return link.guardianEmail.toLowerCase() === normalisedEmail;
    });
  }

  async dashboard(userId: number, email: string): Promise<GuardianLinkedStudent[]> {
    const links = await this.linksFor(userId, email);
    return Promise.all(
      links.map(async (link) => {
        const profile = await this.profileRepo.findOne({
          where: { id: link.educationProfileId },
        });
        const [resultsCount, applicationsCount] = await Promise.all([
          this.resultRepo.count({ where: { educationProfileId: link.educationProfileId } }),
          this.applicationRepo.count({ where: { educationProfileId: link.educationProfileId } }),
        ]);
        const isMinor = profile ? this.consentService.isMinor(profile) : false;
        const hasConsent = await this.consentService.hasValidConsent(link.educationProfileId);
        return {
          linkId: link.id,
          status: link.status,
          educationProfileId: link.educationProfileId,
          studentName: null,
          curriculum: profile ? profile.curriculum : "Other",
          school: profile ? profile.school : null,
          isMinor,
          consentRequired: isMinor && !hasConsent,
          resultsCount,
          applicationsCount,
        };
      }),
    );
  }

  private async ownedLinkOrThrow(
    userId: number,
    email: string,
    linkId: string,
  ): Promise<GuardianLink> {
    const link = await this.guardianLinkRepo.findOne({ where: { id: linkId } });
    if (!link) throw new BadRequestException("Guardian link not found");
    const ownsByUser = link.guardianUserId === userId;
    const ownsByEmail = link.guardianEmail.toLowerCase() === email.trim().toLowerCase();
    if (!ownsByUser && !ownsByEmail) {
      throw new ForbiddenException("This guardian link does not belong to you");
    }
    return link;
  }

  async acceptInvite(userId: number, email: string, linkId: string): Promise<GuardianLink> {
    const link = await this.ownedLinkOrThrow(userId, email, linkId);
    link.status = "accepted";
    link.guardianUserId = userId;
    link.acceptedAt = now().toJSDate();
    return this.guardianLinkRepo.save(link);
  }

  async recordConsentForLink(userId: number, email: string, linkId: string): Promise<void> {
    const link = await this.ownedLinkOrThrow(userId, email, linkId);
    const profile = await this.profileRepo.findOne({ where: { id: link.educationProfileId } });
    if (!profile) throw new BadRequestException("Linked education profile not found");
    await this.consentService.recordConsent({
      educationProfileId: profile.id,
      grantedByUserId: userId,
      grantedByRole: "guardian",
      jurisdiction: this.consentService.jurisdictionForCountry(profile.country),
    });
  }
}
