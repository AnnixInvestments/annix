import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { UserRepository } from "../../user/user.repository";
import { isAcceptedDocumentMime } from "../config/individual-documents.config";
import {
  EeConsentSource,
  type EeDisabilityStatus,
  type EeGender,
  type EeNationalityStatus,
  type EePopulationGroup,
  type EePurpose,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import { IndividualDocumentKind } from "../entities/annix-orbit-individual-document.entity";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { AnnixOrbitIndividualDocumentRepository } from "../repositories/annix-orbit-individual-document.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { CvAuditService } from "./cv-audit.service";
import { CvExtractionService } from "./cv-extraction.service";
import { EmbeddingService } from "./embedding.service";
import { type EeAttributesView, PopiaService } from "./popia.service";

const DELETION_TOKEN_EXPIRY_HOURS = 1;

export interface IndividualProfileStatus {
  profileComplete: boolean;
  hasCv: boolean;
  qualificationsCount: number;
  certificatesCount: number;
  cvUploadedAt: Date | null;
  cvOriginalFilename: string | null;
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
}

export interface IndividualNotificationPreferences {
  matchAlertThreshold: number;
  digestEnabled: boolean;
  pushEnabled: boolean;
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
  ) {}

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
    const saved = await this.candidateRepo.save(candidate);

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

  async status(userId: number): Promise<IndividualProfileStatus> {
    const profile = await this.profileForUser(userId);
    const docs = await this.documentRepo.findByProfile(profile.id);

    const cvDoc = docs.find((d) => d.kind === IndividualDocumentKind.CV) ?? null;
    const qualificationsCount = docs.filter(
      (d) => d.kind === IndividualDocumentKind.QUALIFICATION,
    ).length;
    const certificatesCount = docs.filter(
      (d) => d.kind === IndividualDocumentKind.CERTIFICATE,
    ).length;

    return {
      profileComplete: cvDoc !== null,
      hasCv: cvDoc !== null,
      qualificationsCount,
      certificatesCount,
      cvUploadedAt: profile.cvUploadedAt,
      cvOriginalFilename: cvDoc?.originalFilename ?? null,
    };
  }

  async listDocuments(userId: number): Promise<IndividualDocumentSummary[]> {
    const profile = await this.profileForUser(userId);
    const docs = await this.documentRepo.findByProfileOrdered(profile.id);

    const summaries = await Promise.all(
      docs.map(async (doc) => {
        const downloadUrl = await this.storageService.presignedUrl(doc.filePath, 3600);
        return {
          id: doc.id,
          kind: doc.kind,
          originalFilename: doc.originalFilename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          label: doc.label,
          uploadedAt: doc.uploadedAt,
          downloadUrl,
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
  ): Promise<IndividualDocumentSummary> {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    if (!isAcceptedDocumentMime(file.mimetype)) {
      throw new BadRequestException(
        "Unsupported file type. Please upload PDF, Word, Excel, or PowerPoint.",
      );
    }

    const profile = await this.profileForUser(userId);
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

    const saved = await this.documentRepo.create({
      profileId: profile.id,
      kind,
      filePath: stored.path,
      originalFilename: stored.originalFilename,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      label: label ?? null,
    });

    if (kind === IndividualDocumentKind.CV) {
      await this.refreshCvExtraction(profile, stored.path);
    }

    const downloadUrl = await this.storageService.presignedUrl(saved.filePath, 3600);

    return {
      id: saved.id,
      kind: saved.kind,
      originalFilename: saved.originalFilename,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      label: saved.label,
      uploadedAt: saved.uploadedAt,
      downloadUrl,
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

  private async refreshCvExtraction(profile: AnnixOrbitProfile, cvFilePath: string): Promise<void> {
    profile.cvFilePath = cvFilePath;
    profile.cvUploadedAt = now().toJSDate();

    try {
      const { text, data } = await this.cvExtractionService.processCV(cvFilePath);
      profile.rawCvText = text;
      profile.extractedCvData = data;
    } catch (err) {
      this.logger.warn(
        `CV extraction failed for profile ${profile.id} (file ${cvFilePath}). Stored without extraction. Reason: ${err}`,
      );
      profile.rawCvText = null;
      profile.extractedCvData = null;
    }

    await this.profileRepo.save(profile);

    if (!profile.rawCvText || profile.rawCvText.trim().length === 0) {
      throw new BadRequestException(
        "We couldn't read any text from this CV file. If it is a scanned image, please upload a text-based PDF, Word, or Excel version instead.",
      );
    }

    // Make the seeker matchable: sync a posting-less Candidate from the freshly
    // extracted CV and embed it. Fire-and-forget so the upload response is fast.
    void this.syncCandidateFromProfile(profile).catch((err) => {
      this.logger.warn(
        `Background candidate sync failed for profile ${profile.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  async notificationPreferences(userId: number): Promise<IndividualNotificationPreferences> {
    const profile = await this.profileForUser(userId);
    return {
      matchAlertThreshold: profile.matchAlertThreshold,
      digestEnabled: profile.digestEnabled,
      pushEnabled: profile.pushEnabled,
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
    const user = await this.userRepo.findById(userId);
    if (!user?.email) return null;

    const candidates = await this.candidateRepo.findByEmail(user.email);
    const views = await Promise.all(
      candidates.map((c) =>
        this.popiaService.eeAttributesForCandidate(c.id, "candidate_self", userId),
      ),
    );
    const active = views.filter((v): v is EeAttributesView => v !== null);
    if (active.length === 0) return null;
    return active.reduce((latest, current) =>
      current.consentGrantedAt.getTime() > latest.consentGrantedAt.getTime() ? current : latest,
    );
  }

  async updateEeAttributesForUser(
    userId: number,
    input: SeekerEeUpdateInput,
  ): Promise<{ updated: number; consentTextVersionId: number }> {
    const user = await this.userRepo.findById(userId);
    if (!user?.email) throw new NotFoundException("User not found");

    const candidates = await this.candidateRepo.findByEmail(user.email);
    if (candidates.length === 0) {
      throw new BadRequestException(
        "No candidacies found for your account; apply to a job first before disclosing.",
      );
    }

    const consentTextVersionId = await this.resolveConsentTextVersionId(input.consentTextVersionId);

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
          consentSource: EeConsentSource.CANDIDATE_PORTAL,
          purposes: input.purposes,
          actorId: userId,
        }),
      ),
    );

    return { updated: candidates.length, consentTextVersionId };
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
