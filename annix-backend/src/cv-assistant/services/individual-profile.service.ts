import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { User } from "../../user/entities/user.entity";
import { isAcceptedDocumentMime } from "../config/individual-documents.config";
import { Candidate } from "../entities/candidate.entity";
import {
  CvAssistantIndividualDocument,
  IndividualDocumentKind,
} from "../entities/cv-assistant-individual-document.entity";
import { CvAssistantProfile, CvAssistantUserType } from "../entities/cv-assistant-profile.entity";
import { CvAuditService } from "./cv-audit.service";
import { CvExtractionService } from "./cv-extraction.service";
import { PopiaService } from "./popia.service";

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
}

@Injectable()
export class IndividualProfileService {
  private readonly logger = new Logger(IndividualProfileService.name);

  constructor(
    @InjectRepository(CvAssistantProfile)
    private readonly profileRepo: Repository<CvAssistantProfile>,
    @InjectRepository(CvAssistantIndividualDocument)
    private readonly documentRepo: Repository<CvAssistantIndividualDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly cvExtractionService: CvExtractionService,
    private readonly emailService: EmailService,
    private readonly cvAuditService: CvAuditService,
    private readonly popiaService: PopiaService,
  ) {}

  async profileForUser(userId: number): Promise<CvAssistantProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("CV Assistant profile not found");
    }
    if (profile.userType !== CvAssistantUserType.INDIVIDUAL) {
      throw new BadRequestException("This endpoint is only available to individual job seekers.");
    }
    return profile;
  }

  async status(userId: number): Promise<IndividualProfileStatus> {
    const profile = await this.profileForUser(userId);
    const docs = await this.documentRepo.find({ where: { profileId: profile.id } });

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
    const docs = await this.documentRepo.find({
      where: { profileId: profile.id },
      order: { uploadedAt: "DESC" },
    });

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
    const subPath = `${StorageArea.CV_ASSISTANT}/individuals/${profile.userId}/${kind}`;
    const stored = await this.storageService.upload(file, subPath);

    if (kind === IndividualDocumentKind.CV) {
      const previousCv = await this.documentRepo.findOne({
        where: { profileId: profile.id, kind: IndividualDocumentKind.CV },
      });
      if (previousCv) {
        try {
          await this.storageService.delete(previousCv.filePath);
        } catch (err) {
          this.logger.warn(
            `Failed to delete previous CV file ${previousCv.filePath} for profile ${profile.id}: ${err}`,
          );
        }
        await this.documentRepo.delete(previousCv.id);
      }
    }

    const document = this.documentRepo.create({
      profileId: profile.id,
      kind,
      filePath: stored.path,
      originalFilename: stored.originalFilename,
      mimeType: stored.mimeType,
      sizeBytes: stored.size,
      label: label ?? null,
    });
    const saved = await this.documentRepo.save(document);

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
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, profileId: profile.id },
    });
    if (!doc) {
      throw new NotFoundException("Document not found");
    }

    try {
      await this.storageService.delete(doc.filePath);
    } catch (err) {
      this.logger.warn(`Failed to delete file ${doc.filePath} from storage: ${err}`);
    }

    await this.documentRepo.delete(doc.id);

    if (doc.kind === IndividualDocumentKind.CV) {
      profile.cvFilePath = null;
      profile.rawCvText = null;
      profile.extractedCvData = null;
      profile.cvUploadedAt = null;
      await this.profileRepo.save(profile);
    }
  }

  private async refreshCvExtraction(
    profile: CvAssistantProfile,
    cvFilePath: string,
  ): Promise<void> {
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
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const docs = await this.documentRepo.find({
      where: { profileId: profile.id },
      order: { uploadedAt: "DESC" },
    });

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
    };
  }

  async requestAccountDeletion(userId: number): Promise<{ message: string; email: string }> {
    const profile = await this.profileForUser(userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = uuidv4();
    profile.deletionToken = token;
    profile.deletionTokenExpires = now().plus({ hours: DELETION_TOKEN_EXPIRY_HOURS }).toJSDate();
    await this.profileRepo.save(profile);

    await this.emailService.sendCvAssistantDeletionConfirmEmail(user.email, token);

    return {
      message:
        "We have sent a confirmation link to your email. Click it within 1 hour to permanently delete your account.",
      email: user.email,
    };
  }

  async confirmAccountDeletion(token: string): Promise<{ message: string }> {
    const profile = await this.profileRepo.findOne({
      where: {
        deletionToken: token,
        deletionTokenExpires: MoreThan(now().toJSDate()),
      },
    });

    if (!profile) {
      throw new BadRequestException(
        "Invalid or expired deletion link. Please request a new one from your settings.",
      );
    }

    if (profile.userType !== CvAssistantUserType.INDIVIDUAL) {
      throw new BadRequestException(
        "Account deletion is only available to individual job seekers.",
      );
    }

    return this.performErasure(profile);
  }

  async withdrawConsent(userId: number): Promise<{ message: string; erasedCandidates: number }> {
    const profile = await this.profileForUser(userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const linkedCandidates = await this.candidateRepo.find({
      where: { email: user.email },
      relations: ["jobPosting", "references"],
    });

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

  private async performErasure(profile: CvAssistantProfile): Promise<{ message: string }> {
    const userId = profile.userId;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const docs = await this.documentRepo.find({ where: { profileId: profile.id } });

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
      const linkedCandidates = await this.candidateRepo.find({
        where: { email: user.email },
        relations: ["jobPosting", "references"],
      });
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

    await this.documentRepo.delete({ profileId: profile.id });
    await this.profileRepo.delete(profile.id);
    await this.userRepo.delete(userId);

    await this.cvAuditService.logConsentChange(null, false, "email", userId);

    this.logger.log(`POPIA self-erasure completed for user ${userId}`);
    return { message: "Your account and all associated data have been permanently deleted." };
  }
}
