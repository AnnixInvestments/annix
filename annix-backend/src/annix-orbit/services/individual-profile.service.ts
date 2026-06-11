import { isMatchTier } from "@annix/product-data/sa-market";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { UserRepository } from "../../user/user.repository";
import { isAcceptedDocumentMime, isImageMime } from "../config/individual-documents.config";
import {
  EeConsentSource,
  type EeDisabilityStatus,
  type EeGender,
  type EeNationalityStatus,
  type EePopulationGroup,
  type EePurpose,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import {
  type CredentialFields,
  IndividualDocumentKind,
} from "../entities/annix-orbit-individual-document.entity";
import {
  AnnixOrbitProfile,
  AnnixOrbitUserType,
  isSeekerAgeGroup,
} from "../entities/annix-orbit-profile.entity";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { SEEKER_EVENTS } from "../lib/seeker-testing.constants";
import { AnnixOrbitIndividualDocumentRepository } from "../repositories/annix-orbit-individual-document.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { OrbitEarlyAccessSignupRepository } from "../repositories/orbit-early-access-signup.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import { PendingSeekerTierRepository } from "../repositories/pending-seeker-tier.repository";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { CvAuditService } from "./cv-audit.service";
import { CvExtractionService } from "./cv-extraction.service";
import { EmbeddingService } from "./embedding.service";
import { NixSeekerAssistService } from "./nix-seeker-assist.service";
import { type EeAttributesView, PopiaService } from "./popia.service";
import { SeekerTelemetryService } from "./seeker-telemetry.service";

const DELETION_TOKEN_EXPIRY_HOURS = 1;

export interface IndividualProfileStatus {
  profileComplete: boolean;
  hasCv: boolean;
  qualificationsCount: number;
  certificatesCount: number;
  cvUploadedAt: Date | null;
  cvOriginalFilename: string | null;
  cvExtractionStatus: string | null;
  photoCredentialCapture: boolean;
  dismissWarningAcknowledged: boolean;
  eeDisclosed: boolean;
  onboardingComplete: boolean;
  photoUrl: string | null;
  photoVisibleToEmployers: boolean;
  phoneType: string | null;
  appGuideSeen: boolean;
  ageGroup: string | null;
}

export interface IndividualDocumentSummary {
  id: number;
  kind: IndividualDocumentKind;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  uploadedAt: Date;
  downloadUrl: string;
  isPhotoCapture: boolean;
  needsClearScan: boolean;
  credentialFields: CredentialFields | null;
}

export interface IndividualNotificationPreferences {
  matchAlertThreshold: number;
  digestEnabled: boolean;
  pushEnabled: boolean;
  accountDeletionRequested: boolean;
}

export interface IndividualDataExport {
  exportedAt: string;
  account: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
    emailVerified: boolean;
  };
  profile: {
    matchAlertThreshold: number;
    digestEnabled: boolean;
    pushEnabled: boolean;
    cvUploadedAt: Date | null;
  };
  documents: Array<{
    id: number;
    kind: IndividualDocumentKind;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    label: string | null;
    uploadedAt: Date;
  }>;
  extractedCv: unknown;
  eeAttributes: Array<{
    candidateId: number;
    jobTitle: string | null;
    populationGroup: string;
    gender: string;
    disabilityStatus: string;
    requiresAccommodation: boolean;
    nationalityStatus: string;
    consentGrantedAt: Date;
    consentTextVersionId: number;
    purposes: string[];
  }>;
}

export interface SeekerEeUpdateInput {
  populationGroup: EePopulationGroup;
  gender: EeGender;
  disabilityStatus: EeDisabilityStatus;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus: EeNationalityStatus;
  consentTextVersionId: number | null;
  purposes: EePurpose[];
}

@Injectable()
export class IndividualProfileService {
  private readonly logger = new Logger(IndividualProfileService.name);

  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly documentRepo: AnnixOrbitIndividualDocumentRepository,
    private readonly userRepo: UserRepository,
    private readonly candidateRepo: CandidateRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly cvExtractionService: CvExtractionService,
    private readonly emailService: EmailService,
    private readonly cvAuditService: CvAuditService,
    private readonly popiaService: PopiaService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
    private readonly tierCapabilityRepo: OrbitTierCapabilityRepository,
    private readonly nixSeekerAssistService: NixSeekerAssistService,
    private readonly earlyAccessRepo: OrbitEarlyAccessSignupRepository,
    private readonly seekerTelemetry: SeekerTelemetryService,
    private readonly pendingTierRepo: PendingSeekerTierRepository,
  ) {}

  private async telemetryCandidateId(userId: number): Promise<number | null> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user?.email) return null;
      const candidates = await this.candidateRepo.findByEmail(user.email);
      const first = candidates[0];
      return first ? first.id : null;
    } catch {
      return null;
    }
  }

  // Self-service seekers live as an AnnixOrbitProfile, but matching runs against
  // the Candidate entity (linked by email). Upsert a posting-less Candidate from
  // the profile's extracted CV data, embed it, and (best-effort) refresh matches
  // so the seeker is matchable. Returns the candidate id, or null if there's
  // nothing to sync yet.
  async syncCandidateFromProfile(profile: AnnixOrbitProfile): Promise<number | null> {
    if (!profile.extractedCvData) {
      return null;
    }
    const user = await this.userRepo.findById(profile.userId);
    const email = user?.email ?? null;
    if (!email) {
      return null;
    }
    const fullName = [user?.firstName, user?.lastName]
      .filter((part): part is string => Boolean(part && part.trim().length > 0))
      .join(" ");

    // An admin can pre-assign a seeker tier at invite time (before this candidate
    // exists). Apply it now that the candidate is being created.
    const pendingTier = await this.pendingTierRepo
      .findByEmailNormalized(email.toLowerCase().trim())
      .catch(() => null);
    if (pendingTier && isMatchTier(pendingTier.tier)) {
      profile.selectedTier = pendingTier.tier;
    }

    const existing = await this.candidateRepo.findOneWhere({ email });
    const candidate =
      existing ??
      (await this.candidateRepo.create({
        email,
        jobPostingId: null,
        status: CandidateStatus.NEW,
      }));
    candidate.name =
      profile.extractedCvData.candidateName ?? (fullName.length > 0 ? fullName : null);
    candidate.rawCvText = profile.rawCvText;
    candidate.extractedData = profile.extractedCvData;
    candidate.cvFilePath = profile.cvFilePath;
    if (profile.selectedTier && isMatchTier(profile.selectedTier)) {
      candidate.matchTier = profile.selectedTier;
    }
    const saved = await this.candidateRepo.save(candidate);

    if (pendingTier) {
      try {
        if (!pendingTier.permanent && pendingTier.trialDays) {
          const trialEndsAt = now().plus({ days: pendingTier.trialDays }).toJSDate();
          await this.candidateRepo.setTrial(saved.id, pendingTier.tier, trialEndsAt);
        }
        await this.profileRepo.save(profile);
        await this.pendingTierRepo.deleteByEmailNormalized(email.toLowerCase().trim());
      } catch (err) {
        this.logger.warn(
          `Failed to apply pending seeker tier for ${email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (profile.eeDisclosure) {
      try {
        await this.applyIndividualDisclosureToCandidate(profile, saved.id);
      } catch (err) {
        this.logger.warn(
          `Failed to apply individual EE disclosure to candidate ${saved.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    try {
      const embedded = await this.embeddingService.embedCandidate(saved.id);
      if (embedded) {
        await this.candidateJobMatchingService.matchCandidateToJobs(saved.id);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to embed/match candidate ${saved.id} for profile ${profile.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return saved.id;
  }

  // "Use this CV": store the Nix-built PDF as the seeker's CV document, re-extract
  // it into the profile, then sync + embed + rematch the candidate. Awaits the
  // sync so the caller (and its progress popup) knows when matching is ready.
  async adoptGeneratedCv(
    userId: number,
    pdfBuffer: Buffer,
  ): Promise<{ candidateId: number | null }> {
    const profile = await this.profileForUser(userId);

    const pseudoFile = {
      originalname: "Nix-CV.pdf",
      mimetype: "application/pdf",
      size: pdfBuffer.length,
      buffer: pdfBuffer,
    } as unknown as Express.Multer.File;
    const subPath = `${StorageArea.ANNIX_ORBIT}/individuals/${profile.userId}/${IndividualDocumentKind.CV}`;
    const stored = await this.storageService.upload(pseudoFile, subPath);

    const previousCv = await this.documentRepo.findOneWhere({
      profileId: profile.id,
      kind: IndividualDocumentKind.CV,
    });
    if (previousCv) {
      try {
        await this.storageService.delete(previousCv.filePath);
      } catch (err) {
        this.logger.warn(`Failed to delete previous CV file ${previousCv.filePath}: ${err}`);
      }
      await this.documentRepo.remove(previousCv);
    }

    await this.documentRepo.create({
      profileId: profile.id,
      kind: IndividualDocumentKind.CV,
      filePath: stored.path,
      originalFilename: stored.originalFilename,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      label: "Built by Nix",
    });

    profile.cvFilePath = stored.path;
    profile.cvUploadedAt = now().toJSDate();
    const { text, data } = await this.cvExtractionService.processCV(stored.path);
    profile.rawCvText = text;
    profile.extractedCvData = data;
    await this.profileRepo.save(profile);

    const candidateId = await this.syncCandidateFromProfile(profile);
    return { candidateId };
  }

  async profileForUser(userId: number): Promise<AnnixOrbitProfile> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("CV Assistant profile not found");
    }
    if (profile.userType !== AnnixOrbitUserType.INDIVIDUAL) {
      throw new BadRequestException("This endpoint is only available to individual job seekers.");
    }
    return profile;
  }

  private effectiveTier(candidate: Candidate): string {
    if (
      candidate.trialTier &&
      candidate.trialEndsAt &&
      candidate.trialEndsAt.getTime() > now().toMillis()
    ) {
      return candidate.trialTier;
    }
    return candidate.matchTier;
  }

  private async photoCredentialCaptureAllowed(email: string | null): Promise<boolean> {
    if (!email) {
      return false;
    }
    const candidates = await this.candidateRepo.findByEmail(email);
    const candidate = candidates.length > 0 ? candidates[0] : null;
    const tier = candidate ? this.effectiveTier(candidate) : null;
    if (!tier) {
      return false;
    }
    const capability = await this.tierCapabilityRepo.findByTier(tier);
    return capability?.features?.photoCredentialCapture === true;
  }

  async status(userId: number): Promise<IndividualProfileStatus> {
    const profile = await this.profileForUser(userId);
    const docs = await this.documentRepo.findByProfile(profile.id);
    const user = await this.userRepo.findById(userId);

    const cvDoc = docs.find((d) => d.kind === IndividualDocumentKind.CV) ?? null;
    const qualificationsCount = docs.filter(
      (d) => d.kind === IndividualDocumentKind.QUALIFICATION,
    ).length;
    const certificatesCount = docs.filter(
      (d) => d.kind === IndividualDocumentKind.CERTIFICATE,
    ).length;
    const photoCredentialCapture = await this.photoCredentialCaptureAllowed(user?.email ?? null);
    const photoUrl = profile.photoFilePath
      ? await this.storageService.presignedUrl(profile.photoFilePath, 3600)
      : null;

    return {
      profileComplete: cvDoc !== null,
      hasCv: cvDoc !== null,
      qualificationsCount,
      certificatesCount,
      cvUploadedAt: profile.cvUploadedAt,
      cvOriginalFilename: cvDoc?.originalFilename ?? null,
      cvExtractionStatus: profile.cvExtractionStatus ?? null,
      photoCredentialCapture,
      dismissWarningAcknowledged: profile.dismissWarningAcknowledgedAt != null,
      eeDisclosed: profile.eeDisclosure != null,
      onboardingComplete: profile.onboardingCompletedAt != null,
      photoUrl,
      photoVisibleToEmployers: profile.photoVisibleToEmployers,
      phoneType: profile.phoneType ?? null,
      appGuideSeen: profile.appGuideSeen === true,
      ageGroup: profile.ageGroup ?? null,
    };
  }

  async updateSeekerPreferences(
    userId: number,
    input: { phoneType?: string | null; appGuideSeen?: boolean; ageGroup?: string | null },
  ): Promise<{ phoneType: string | null; appGuideSeen: boolean; ageGroup: string | null }> {
    const profile = await this.profileForUser(userId);
    if (input.phoneType !== undefined) {
      const allowed = input.phoneType === "apple" || input.phoneType === "android";
      profile.phoneType = allowed ? input.phoneType : null;
    }
    if (input.appGuideSeen !== undefined) {
      profile.appGuideSeen = input.appGuideSeen;
    }
    if (input.ageGroup !== undefined) {
      profile.ageGroup =
        input.ageGroup !== null && isSeekerAgeGroup(input.ageGroup) ? input.ageGroup : null;
    }
    await this.profileRepo.save(profile);
    return {
      phoneType: profile.phoneType ?? null,
      appGuideSeen: profile.appGuideSeen === true,
      ageGroup: profile.ageGroup ?? null,
    };
  }

  async completeOnboarding(userId: number): Promise<{ onboardingCompletedAt: string }> {
    const profile = await this.profileForUser(userId);
    if (!profile.onboardingCompletedAt) {
      profile.onboardingCompletedAt = now().toJSDate();
      await this.profileRepo.save(profile);
    }
    const candidateId = await this.telemetryCandidateId(userId);
    await this.seekerTelemetry.record(candidateId, SEEKER_EVENTS.profileCompleted);
    const completedAt = profile.onboardingCompletedAt;
    return { onboardingCompletedAt: completedAt ? completedAt.toISOString() : "" };
  }

  async uploadProfilePhoto(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ photoUrl: string }> {
    const profile = await this.profileForUser(userId);
    const stored = await this.storageService.upload(file, `annix-orbit/profile-photos/${userId}`);
    profile.photoFilePath = stored.path;
    await this.profileRepo.save(profile);
    const photoUrl = await this.storageService.presignedUrl(stored.path, 3600);
    return { photoUrl };
  }

  async removeProfilePhoto(userId: number): Promise<void> {
    const profile = await this.profileForUser(userId);
    profile.photoFilePath = null;
    await this.profileRepo.save(profile);
  }

  async setPhotoVisibility(
    userId: number,
    visible: boolean,
  ): Promise<{ photoVisibleToEmployers: boolean }> {
    const profile = await this.profileForUser(userId);
    profile.photoVisibleToEmployers = visible;
    await this.profileRepo.save(profile);
    return { photoVisibleToEmployers: visible };
  }

  async employerVisiblePhotoUrlByEmail(email: string | null): Promise<string | null> {
    if (!email || email.trim().length === 0) {
      return null;
    }
    const user = await this.userRepo.findOneByEmail(email);
    if (!user) {
      return null;
    }
    const profile = await this.profileRepo.findByUserId(user.id);
    if (!profile?.photoFilePath || !profile.photoVisibleToEmployers) {
      return null;
    }
    return this.storageService.presignedUrl(profile.photoFilePath, 3600);
  }

  async profilePhotoDataUri(userId: number): Promise<string | null> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile?.photoFilePath) {
      return null;
    }
    try {
      const buffer = await this.storageService.download(profile.photoFilePath);
      const mimeType = imageMimeTypeForPath(profile.photoFilePath);
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not embed profile photo for user ${userId}: ${message}`);
      return null;
    }
  }

  async acknowledgeDismissWarning(userId: number): Promise<{ acknowledgedAt: string }> {
    const profile = await this.profileForUser(userId);
    if (!profile.dismissWarningAcknowledgedAt) {
      profile.dismissWarningAcknowledgedAt = now().toJSDate();
      await this.profileRepo.save(profile);
    }
    const acknowledgedAt = profile.dismissWarningAcknowledgedAt;
    return { acknowledgedAt: acknowledgedAt ? acknowledgedAt.toISOString() : "" };
  }

  async sendAppLink(userId: number): Promise<{ sent: boolean; email: string }> {
    const user = await this.userRepo.findById(userId);
    const email = user ? user.email : null;
    if (!email) {
      throw new NotFoundException("No email on file for this account");
    }
    const sent = await this.emailService.sendAnnixOrbitAppLinkEmail(email);
    return { sent, email };
  }

  async listDocuments(userId: number): Promise<IndividualDocumentSummary[]> {
    const profile = await this.profileForUser(userId);
    const docs = await this.documentRepo.findByProfileOrdered(profile.id);

    const summaries = await Promise.all(
      docs.map(async (doc) => {
        const downloadUrl = await this.storageService.presignedUrl(
          doc.filePath,
          3600,
          doc.originalFilename,
        );
        return {
          id: doc.id,
          kind: doc.kind,
          originalFilename: doc.originalFilename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          label: doc.label,
          uploadedAt: doc.uploadedAt,
          downloadUrl,
          isPhotoCapture: doc.isPhotoCapture === true,
          needsClearScan: doc.needsClearScan === true,
          credentialFields: doc.credentialFields ?? null,
        };
      }),
    );

    return summaries;
  }

  async uploadDocument(
    userId: number,
    file: Express.Multer.File,
    kind: IndividualDocumentKind,
    label?: string | null,
    source?: "upload" | "photo",
  ): Promise<IndividualDocumentSummary> {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    if (!isAcceptedDocumentMime(file.mimetype)) {
      throw new BadRequestException(
        "Unsupported file type. Please upload a PDF, Word, Excel, PowerPoint, or photo.",
      );
    }

    const isPhotoCapture = source === "photo";
    const profile = await this.profileForUser(userId);

    if (isPhotoCapture) {
      if (
        kind !== IndividualDocumentKind.QUALIFICATION &&
        kind !== IndividualDocumentKind.CERTIFICATE
      ) {
        throw new BadRequestException(
          "Photo capture is only available for qualifications and certificates.",
        );
      }
      if (!isImageMime(file.mimetype)) {
        throw new BadRequestException("Please capture a JPEG or PNG photo.");
      }
      const user = await this.userRepo.findById(userId);
      const allowed = await this.photoCredentialCaptureAllowed(user?.email ?? null);
      if (!allowed) {
        throw new ForbiddenException(
          "Photo capture is available on the Pathfinder and Trailblazer plans.",
        );
      }
    }

    const subPath = `${StorageArea.ANNIX_ORBIT}/individuals/${profile.userId}/${kind}`;
    const stored = await this.storageService.upload(file, subPath);

    if (kind === IndividualDocumentKind.CV) {
      const previousCv = await this.documentRepo.findByProfileAndKind(
        profile.id,
        IndividualDocumentKind.CV,
      );
      if (previousCv) {
        try {
          await this.storageService.delete(previousCv.filePath);
        } catch (err) {
          this.logger.warn(
            `Failed to delete previous CV file ${previousCv.filePath} for profile ${profile.id}: ${err}`,
          );
        }
        await this.documentRepo.deleteById(previousCv.id);
      }
    }

    let resolvedLabel = label ?? null;
    let credentialFields: CredentialFields | null = null;
    if (
      isPhotoCapture &&
      (kind === IndividualDocumentKind.QUALIFICATION || kind === IndividualDocumentKind.CERTIFICATE)
    ) {
      const analysis = await this.nixSeekerAssistService.analyzeCredentialPhoto(
        file.buffer,
        file.mimetype,
        kind,
      );
      credentialFields = analysis.fields;
      if (!resolvedLabel && analysis.label) {
        resolvedLabel = analysis.label;
      }
    }

    const saved = await this.documentRepo.create({
      profileId: profile.id,
      kind,
      filePath: stored.path,
      originalFilename: stored.originalFilename,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      credentialFields,
      label: resolvedLabel,
      isPhotoCapture,
      needsClearScan: isPhotoCapture,
    });

    if (kind === IndividualDocumentKind.CV) {
      await this.markCvProcessing(profile, stored.path);
    }

    // A clear (non-photo) qualification/certificate upload resolves any pending
    // phone photos of the same kind so the reminders stop and it becomes
    // employer-visible.
    if (
      !isPhotoCapture &&
      (kind === IndividualDocumentKind.QUALIFICATION || kind === IndividualDocumentKind.CERTIFICATE)
    ) {
      await this.documentRepo.clearScanFlagForProfileKind(profile.id, kind);
    }

    const downloadUrl = await this.storageService.presignedUrl(
      saved.filePath,
      3600,
      saved.originalFilename,
    );

    const candidateId = await this.telemetryCandidateId(userId);
    if (kind === IndividualDocumentKind.CV) {
      await this.seekerTelemetry.record(candidateId, SEEKER_EVENTS.cvUploaded);
    } else if (
      kind === IndividualDocumentKind.QUALIFICATION ||
      kind === IndividualDocumentKind.CERTIFICATE
    ) {
      await this.seekerTelemetry.record(candidateId, SEEKER_EVENTS.qualificationUploaded);
    }

    return {
      id: saved.id,
      kind: saved.kind,
      originalFilename: saved.originalFilename,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      label: saved.label,
      uploadedAt: saved.uploadedAt,
      downloadUrl,
      isPhotoCapture: saved.isPhotoCapture === true,
      needsClearScan: saved.needsClearScan === true,
      credentialFields: saved.credentialFields ?? null,
    };
  }

  async updateCredentialFields(
    userId: number,
    documentId: number,
    input: Partial<CredentialFields>,
  ): Promise<IndividualDocumentSummary> {
    const profile = await this.profileForUser(userId);
    const doc = await this.documentRepo.findByIdForProfile(documentId, profile.id);
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    const current = doc.credentialFields ?? {
      credentialName: null,
      issuer: null,
      dateAwarded: null,
      nqfLevel: null,
      expiry: null,
    };
    const normalise = (value: string | null | undefined): string | null => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    const next: CredentialFields = {
      credentialName:
        input.credentialName !== undefined
          ? normalise(input.credentialName)
          : current.credentialName,
      issuer: input.issuer !== undefined ? normalise(input.issuer) : current.issuer,
      dateAwarded:
        input.dateAwarded !== undefined ? normalise(input.dateAwarded) : current.dateAwarded,
      nqfLevel: input.nqfLevel !== undefined ? normalise(input.nqfLevel) : current.nqfLevel,
      expiry: input.expiry !== undefined ? normalise(input.expiry) : current.expiry,
    };

    const fieldKeys: Array<keyof CredentialFields> = [
      "credentialName",
      "issuer",
      "dateAwarded",
      "nqfLevel",
      "expiry",
    ];
    const corrections = fieldKeys
      .filter((key) => next[key] !== current[key] && next[key] != null)
      .map((key) => ({ field: key, original: current[key], corrected: next[key] as string }));

    doc.credentialFields = next;
    const namePart = next.credentialName;
    const suffix = [next.issuer, next.dateAwarded].filter((part): part is string =>
      Boolean(part && part.length > 0),
    );
    doc.label = namePart
      ? suffix.length > 0
        ? `${namePart} — ${suffix.join(", ")}`
        : namePart
      : doc.label;
    const saved = await this.documentRepo.save(doc);

    if (corrections.length > 0) {
      try {
        await this.nixSeekerAssistService.recordCredentialCorrections(corrections);
      } catch (err) {
        this.logger.warn(
          `Failed to record credential corrections for document ${documentId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    const downloadUrl = await this.storageService.presignedUrl(
      saved.filePath,
      3600,
      saved.originalFilename,
    );
    return {
      id: saved.id,
      kind: saved.kind,
      originalFilename: saved.originalFilename,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      label: saved.label,
      uploadedAt: saved.uploadedAt,
      downloadUrl,
      isPhotoCapture: saved.isPhotoCapture === true,
      needsClearScan: saved.needsClearScan === true,
      credentialFields: saved.credentialFields ?? null,
    };
  }

  async deleteDocument(userId: number, documentId: number): Promise<void> {
    const profile = await this.profileForUser(userId);
    const doc = await this.documentRepo.findByIdForProfile(documentId, profile.id);
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    try {
      await this.storageService.delete(doc.filePath);
    } catch (err) {
      this.logger.warn(`Failed to delete file ${doc.filePath} from storage: ${err}`);
    }

    await this.documentRepo.deleteById(doc.id);

    if (doc.kind === IndividualDocumentKind.CV) {
      profile.cvFilePath = null;
      profile.rawCvText = null;
      profile.extractedCvData = null;
      profile.cvUploadedAt = null;
      await this.profileRepo.save(profile);
    }
  }

  // Mark the CV as processing and kick extraction off in the background. The
  // text extraction can involve LibreOffice conversion, vision OCR and an AI
  // structured-extraction call - tens of seconds the seeker should not spend
  // staring at an upload spinner (test feedback #11, issue #344). The seeker
  // UI polls profile status for the outcome.
  private async markCvProcessing(profile: AnnixOrbitProfile, cvFilePath: string): Promise<void> {
    profile.cvFilePath = cvFilePath;
    profile.cvUploadedAt = now().toJSDate();
    profile.rawCvText = null;
    profile.extractedCvData = null;
    profile.cvExtractionStatus = "processing";
    await this.profileRepo.save(profile);

    void this.runCvExtraction(profile.id, cvFilePath).catch((err) => {
      this.logger.warn(
        `Background CV extraction crashed for profile ${profile.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  private async runCvExtraction(profileId: number, cvFilePath: string): Promise<void> {
    const profile = await this.profileRepo.findById(profileId);
    if (!profile || profile.cvFilePath !== cvFilePath) {
      // The CV was replaced or the profile vanished while we were queued -
      // the newer upload's run owns the status now.
      return;
    }

    try {
      const { text, data } = await this.cvExtractionService.processCV(cvFilePath);
      profile.rawCvText = text;
      profile.extractedCvData = data;
      const readable = text != null && text.trim().length > 0;
      profile.cvExtractionStatus = readable ? "completed" : "unreadable";
      await this.profileRepo.save(profile);
      if (!readable) {
        return;
      }
    } catch (err) {
      this.logger.warn(
        `CV extraction failed for profile ${profile.id} (file ${cvFilePath}). Stored without extraction. Reason: ${err}`,
      );
      profile.rawCvText = null;
      profile.extractedCvData = null;
      profile.cvExtractionStatus = "failed";
      await this.profileRepo.save(profile);
      return;
    }

    // Make the seeker matchable: sync a posting-less Candidate from the freshly
    // extracted CV and embed it.
    void this.syncCandidateFromProfile(profile).catch((err) => {
      this.logger.warn(
        `Background candidate sync failed for profile ${profile.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  private accountDeletionRequested(profile: AnnixOrbitProfile): boolean {
    return (
      profile.deletionToken != null &&
      profile.deletionTokenExpires != null &&
      profile.deletionTokenExpires.getTime() > now().toMillis()
    );
  }

  async notificationPreferences(userId: number): Promise<IndividualNotificationPreferences> {
    const profile = await this.profileForUser(userId);
    return {
      matchAlertThreshold: profile.matchAlertThreshold,
      digestEnabled: profile.digestEnabled,
      pushEnabled: profile.pushEnabled,
      accountDeletionRequested: this.accountDeletionRequested(profile),
    };
  }

  async updateNotificationPreferences(
    userId: number,
    body: { matchAlertThreshold?: number; digestEnabled?: boolean; pushEnabled?: boolean },
  ): Promise<IndividualNotificationPreferences> {
    const profile = await this.profileForUser(userId);

    if (body.matchAlertThreshold != null) {
      profile.matchAlertThreshold = Math.max(0, Math.min(100, body.matchAlertThreshold));
    }
    if (body.digestEnabled != null) {
      profile.digestEnabled = body.digestEnabled;
    }
    if (body.pushEnabled != null) {
      profile.pushEnabled = body.pushEnabled;
    }

    await this.profileRepo.save(profile);
    return {
      matchAlertThreshold: profile.matchAlertThreshold,
      digestEnabled: profile.digestEnabled,
      pushEnabled: profile.pushEnabled,
      accountDeletionRequested: this.accountDeletionRequested(profile),
    };
  }

  async dataExport(userId: number): Promise<IndividualDataExport> {
    const profile = await this.profileForUser(userId);
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const docs = await this.documentRepo.findByProfileOrdered(profile.id);

    return {
      exportedAt: now().toISO() ?? "",
      account: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      },
      profile: {
        matchAlertThreshold: profile.matchAlertThreshold,
        digestEnabled: profile.digestEnabled,
        pushEnabled: profile.pushEnabled,
        cvUploadedAt: profile.cvUploadedAt,
      },
      documents: docs.map((doc) => ({
        id: doc.id,
        kind: doc.kind,
        originalFilename: doc.originalFilename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        label: doc.label,
        uploadedAt: doc.uploadedAt,
      })),
      extractedCv: profile.extractedCvData,
      eeAttributes: await this.eeAttributesForExport(user.email),
    };
  }

  private async eeAttributesForExport(email: string | null): Promise<
    Array<{
      candidateId: number;
      jobTitle: string | null;
      populationGroup: string;
      gender: string;
      disabilityStatus: string;
      requiresAccommodation: boolean;
      nationalityStatus: string;
      consentGrantedAt: Date;
      consentTextVersionId: number;
      purposes: string[];
    }>
  > {
    if (!email) return [];
    const linkedCandidates = await this.candidateRepo.findByEmailWithJobPosting(email);
    const rowsAcrossCandidates = await Promise.all(
      linkedCandidates.map(async (candidate) => {
        const view = await this.popiaService.eeAttributesForCandidate(
          candidate.id,
          "candidate_self",
          null,
        );
        if (!view) return null;
        return {
          candidateId: candidate.id,
          jobTitle: candidate.jobPosting?.title ?? null,
          populationGroup: view.populationGroup,
          gender: view.gender,
          disabilityStatus: view.disabilityStatus,
          requiresAccommodation: view.requiresAccommodation,
          nationalityStatus: view.nationalityStatus,
          consentGrantedAt: view.consentGrantedAt,
          consentTextVersionId: view.consentTextVersionId,
          purposes: view.purposes,
        };
      }),
    );
    return rowsAcrossCandidates.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  async eeAttributesForUser(userId: number): Promise<EeAttributesView | null> {
    const profile = await this.profileForUser(userId);
    const ee = profile.eeDisclosure;
    if (!ee) return null;
    return {
      populationGroup: ee.populationGroup,
      gender: ee.gender,
      disabilityStatus: ee.disabilityStatus,
      requiresAccommodation: ee.requiresAccommodation,
      accommodationNotes: ee.accommodationNotes,
      nationalityStatus: ee.nationalityStatus,
      consentTextVersionId: ee.consentTextVersionId,
      consentGrantedAt: ee.consentGrantedAt,
      purposes: ee.purposes,
    };
  }

  async eeSuggestionForUser(userId: number): Promise<{ populationGroup: string | null }> {
    const existing = await this.eeAttributesForUser(userId);
    if (existing) {
      return { populationGroup: null };
    }
    const user = await this.userRepo.findById(userId);
    const email = user ? user.email : null;
    if (!email) {
      return { populationGroup: null };
    }
    const signup = await this.earlyAccessRepo.findByEmailNormalized(email.trim().toLowerCase());
    return { populationGroup: signup ? signup.ethnicBackground : null };
  }

  async updateEeAttributesForUser(
    userId: number,
    input: SeekerEeUpdateInput,
  ): Promise<{ updated: number; consentTextVersionId: number }> {
    const user = await this.userRepo.findById(userId);
    if (!user?.email) throw new NotFoundException("User not found");

    const profile = await this.profileForUser(userId);
    const consentTextVersionId = await this.resolveConsentTextVersionId(input.consentTextVersionId);

    profile.eeDisclosure = {
      populationGroup: input.populationGroup,
      gender: input.gender,
      disabilityStatus: input.disabilityStatus,
      requiresAccommodation: input.requiresAccommodation,
      accommodationNotes: input.accommodationNotes,
      nationalityStatus: input.nationalityStatus,
      purposes: input.purposes,
      consentTextVersionId,
      consentGrantedAt: now().toJSDate(),
      consentSource: EeConsentSource.SEEKER_PORTAL,
      updatedAt: now().toJSDate(),
    };
    await this.profileRepo.save(profile);

    const candidates = await this.candidateRepo.findByEmail(user.email);
    await Promise.all(
      candidates.map((candidate) =>
        this.popiaService.recordEeConsent({
          candidateId: candidate.id,
          populationGroup: input.populationGroup,
          gender: input.gender,
          disabilityStatus: input.disabilityStatus,
          requiresAccommodation: input.requiresAccommodation,
          accommodationNotes: input.accommodationNotes,
          nationalityStatus: input.nationalityStatus,
          consentTextVersionId,
          consentSource: EeConsentSource.SEEKER_PORTAL,
          purposes: input.purposes,
          actorId: userId,
        }),
      ),
    );

    return { updated: candidates.length, consentTextVersionId };
  }

  async applyIndividualDisclosureToCandidate(
    profile: AnnixOrbitProfile,
    candidateId: number,
  ): Promise<boolean> {
    const ee = profile.eeDisclosure;
    if (!ee) return false;
    await this.popiaService.recordEeConsent({
      candidateId,
      populationGroup: ee.populationGroup,
      gender: ee.gender,
      disabilityStatus: ee.disabilityStatus,
      requiresAccommodation: ee.requiresAccommodation,
      accommodationNotes: ee.accommodationNotes,
      nationalityStatus: ee.nationalityStatus,
      consentTextVersionId: ee.consentTextVersionId,
      consentSource: ee.consentSource,
      purposes: ee.purposes,
      actorId: profile.userId,
    });
    return true;
  }

  private async resolveConsentTextVersionId(provided: number | null): Promise<number> {
    if (provided !== null) return provided;
    const active = await this.popiaService.activeConsentTextVersion();
    if (!active) {
      throw new BadRequestException(
        "No active EE consent text version configured; ask the company HR team to seed one before disclosing.",
      );
    }
    return active.id;
  }

  async deleteEeAttributesForUser(userId: number): Promise<{ tombstoned: number }> {
    const user = await this.userRepo.findById(userId);
    if (!user?.email) throw new NotFoundException("User not found");

    const profile = await this.profileForUser(userId);
    profile.eeDisclosure = null;
    await this.profileRepo.save(profile);

    const candidates = await this.candidateRepo.findByEmail(user.email);
    await Promise.all(candidates.map((c) => this.popiaService.tombstoneEeAttributes(c.id, userId)));

    return { tombstoned: candidates.length };
  }

  async requestAccountDeletion(userId: number): Promise<{ message: string; email: string }> {
    const profile = await this.profileForUser(userId);
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = uuidv4();
    profile.deletionToken = token;
    profile.deletionTokenExpires = now().plus({ hours: DELETION_TOKEN_EXPIRY_HOURS }).toJSDate();
    await this.profileRepo.save(profile);

    await this.emailService.sendAnnixOrbitDeletionConfirmEmail(user.email, token);

    return {
      message:
        "We have sent a confirmation link to your email. Click it within 1 hour to permanently delete your account.",
      email: user.email,
    };
  }

  async confirmAccountDeletion(token: string): Promise<{ message: string }> {
    const profile = await this.profileRepo.findByValidDeletionToken(token, now().toJSDate());

    if (!profile) {
      throw new BadRequestException(
        "Invalid or expired deletion link. Please request a new one from your settings.",
      );
    }

    if (profile.userType !== AnnixOrbitUserType.INDIVIDUAL) {
      throw new BadRequestException(
        "Account deletion is only available to individual job seekers.",
      );
    }

    return this.performErasure(profile);
  }

  async withdrawConsent(userId: number): Promise<{ message: string; erasedCandidates: number }> {
    const profile = await this.profileForUser(userId);
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const linkedCandidates = await this.candidateRepo.findByEmailWithJobAndReferences(user.email);

    const erased = await linkedCandidates.reduce(async (accPromise, candidate) => {
      const acc = await accPromise;
      try {
        await this.popiaService.eraseCandidateData(candidate, "requested");
        return acc + 1;
      } catch (err) {
        this.logger.warn(
          `Failed to erase candidate ${candidate.id} during consent withdrawal: ${err instanceof Error ? err.message : String(err)}`,
        );
        return acc;
      }
    }, Promise.resolve(0));

    await this.cvAuditService.logConsentChange(null, false, "portal", userId);
    profile.updatedAt = now().toJSDate();
    await this.profileRepo.save(profile);

    this.logger.log(
      `POPIA consent withdrawn for user ${userId}; erased ${erased} candidate row(s).`,
    );

    return {
      message:
        erased > 0
          ? `Consent withdrawn. We have permanently deleted ${erased} job application${erased === 1 ? "" : "s"} tied to your email.`
          : "Consent withdrawn. No job applications were on file for your email.",
      erasedCandidates: erased,
    };
  }

  private async performErasure(profile: AnnixOrbitProfile): Promise<{ message: string }> {
    const userId = profile.userId;
    const user = await this.userRepo.findById(userId);
    const docs = await this.documentRepo.findByProfile(profile.id);

    await Promise.all(
      docs.map(async (doc) => {
        try {
          await this.storageService.delete(doc.filePath);
        } catch (err) {
          this.logger.warn(`Failed to delete file ${doc.filePath} during erasure: ${err}`);
        }
      }),
    );

    if (user?.email) {
      const linkedCandidates = await this.candidateRepo.findByEmailWithJobAndReferences(user.email);
      await Promise.all(
        linkedCandidates.map(async (candidate) => {
          try {
            await this.popiaService.eraseCandidateData(candidate, "requested");
          } catch (err) {
            this.logger.warn(
              `Failed to erase candidate ${candidate.id} during seeker self-erasure: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }),
      );
    }

    await this.documentRepo.deleteByProfile(profile.id);
    await this.profileRepo.remove(profile);
    await this.userRepo.deleteById(userId);

    await this.cvAuditService.logConsentChange(null, false, "email", userId);

    this.logger.log(`POPIA self-erasure completed for user ${userId}`);
    return { message: "Your account and all associated data have been permanently deleted." };
  }
}

function imageMimeTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  return "image/jpeg";
}
