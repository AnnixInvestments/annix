import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { LearningSource, LearningType } from "../../nix/entities/nix-learning.entity";
import { NixLearningRepository } from "../../nix/nix-learning.repository";
import {
  type CredentialFields,
  IndividualDocumentKind,
} from "../entities/annix-orbit-individual-document.entity";
import { AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitIndividualDocumentRepository } from "../repositories/annix-orbit-individual-document.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import {
  calendarAdvisoryPrompt,
  credentialPhotoPrompt,
  type NixCalendarAdvisoryConflict,
  type NixCalendarAdvisoryResponse,
  type NixCredentialPhotoResult,
  type NixGeneratedCv,
  type NixSeekerCvAssessmentResponse,
  parseNixJson,
  seekerCvGenerationPrompt,
  seekerCvImprovementPrompt,
} from "./nix-prompts";

type CredentialPhotoMediaType = "image/jpeg" | "image/png" | "image/webp";

function credentialPhotoMediaType(mimeType: string): CredentialPhotoMediaType | null {
  if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp") {
    return mimeType;
  }
  return null;
}

function credentialPhotoLabel(result: NixCredentialPhotoResult): string | null {
  const name = result.credentialName?.trim();
  if (!name) {
    return null;
  }
  const issuer = result.issuer?.trim();
  const year = result.dateAwarded?.trim();
  const suffixParts = [issuer, year].filter((part): part is string =>
    Boolean(part && part.length > 0),
  );
  return suffixParts.length > 0 ? `${name} — ${suffixParts.join(", ")}` : name;
}

const METRIC_CATEGORY = "annix-orbit-nix-seeker";
const CREDENTIAL_LEARNING_CATEGORY = "orbit-credential-photo";

const EMPTY_CREDENTIAL_FIELDS: CredentialFields = {
  credentialName: null,
  issuer: null,
  dateAwarded: null,
  nqfLevel: null,
  expiry: null,
};

const CREDENTIAL_FIELD_LABELS: Record<keyof CredentialFields, string> = {
  credentialName: "name",
  issuer: "issuer",
  dateAwarded: "date awarded",
  nqfLevel: "NQF level",
  expiry: "expiry",
};

function normaliseCorrectionKey(value: string): string {
  return value.trim().toLowerCase();
}

// Deterministic guard so a role's place never appears twice (e.g. employer
// "Selfridges - London" alongside location "London, UK") — a tell that flags
// AI-built CVs. When the location's leading city token is also tacked onto the
// end of the employer name, strip it from the employer so the place shows once.
function dedupeExperienceLocations(cv: NixGeneratedCv): NixGeneratedCv {
  const experience = (cv.experience ?? []).map((exp) => {
    const location = exp.location;
    if (!location || location.trim().length === 0) {
      return exp;
    }
    const cityToken = location.split(/[,/]/)[0].trim();
    if (cityToken.length === 0) {
      return exp;
    }
    const escaped = cityToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const trailingCity = new RegExp(`\\s*[-–·,/]\\s*${escaped}\\s*$`, "i");
    const employer = exp.employer.replace(trailingCity, "").trim();
    if (employer.length === 0 || employer === exp.employer) {
      return exp;
    }
    return { ...exp, employer };
  });
  return { ...cv, experience };
}

@Injectable()
export class NixSeekerAssistService {
  private readonly logger = new Logger(NixSeekerAssistService.name);

  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly documentRepo: AnnixOrbitIndividualDocumentRepository,
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
    private readonly learningRepo: NixLearningRepository,
  ) {}

  private async credentialCorrectionExamples(): Promise<string[]> {
    try {
      const rules = await this.learningRepo.findActiveCorrectionsByCategoryTopByConfidence(
        CREDENTIAL_LEARNING_CATEGORY,
        12,
      );
      return rules
        .filter((rule) => rule.originalValue && rule.learnedValue)
        .map((rule) => {
          const context = rule.context as { field?: string } | undefined;
          const fieldLabel = context?.field ? context.field : "value";
          return `for ${fieldLabel}, "${rule.originalValue}" should be "${rule.learnedValue}"`;
        });
    } catch (err) {
      this.logger.warn(
        `Failed to load credential correction examples: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }
  }

  async recordCredentialCorrections(
    changes: Array<{ field: keyof CredentialFields; original: string | null; corrected: string }>,
  ): Promise<void> {
    await Promise.all(
      changes.map(async (change) => {
        const fieldLabel = CREDENTIAL_FIELD_LABELS[change.field];
        const originalKey = change.original ? normaliseCorrectionKey(change.original) : "(blank)";
        const patternKey = `orbit-credential::${change.field}::${originalKey}`;
        const existing = await this.learningRepo.findCorrectionByPatternKey(patternKey);
        if (existing) {
          if (existing.learnedValue === change.corrected) {
            existing.confirmationCount += 1;
            existing.confidence = Math.min(1, existing.confidence + 0.05);
          } else {
            existing.learnedValue = change.corrected;
            existing.originalValue = change.original ?? undefined;
            existing.confirmationCount = 1;
            existing.confidence = 0.6;
          }
          await this.learningRepo.save(existing);
        } else {
          await this.learningRepo.create({
            learningType: LearningType.CORRECTION,
            source: LearningSource.USER_CORRECTION,
            category: CREDENTIAL_LEARNING_CATEGORY,
            patternKey,
            originalValue: change.original ?? undefined,
            learnedValue: change.corrected,
            context: { field: fieldLabel },
            confidence: 0.6,
            confirmationCount: 1,
            isActive: true,
          });
        }
      }),
    );
  }

  async cvImprovements(userId: number): Promise<NixSeekerCvAssessmentResponse> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException("CV Assistant profile not found");
    }
    if (profile.userType !== AnnixOrbitUserType.INDIVIDUAL) {
      throw new BadRequestException("Nix Wizard CV review is only for individual job seekers.");
    }
    if (!profile.cvFilePath) {
      throw new BadRequestException(
        "Upload your CV first — Nix needs at least your CV before it can suggest improvements.",
      );
    }
    if (!profile.rawCvText || profile.rawCvText.trim().length === 0) {
      throw new BadRequestException(
        "We couldn't read any text from your CV file. If it is a scanned image, please re-upload a text-based PDF, Word, or Excel version.",
      );
    }

    const documents = await this.documentRepo.findByProfileOrdered(profile.id);

    const supportingDocuments = documents
      .filter(
        (doc) =>
          doc.kind === IndividualDocumentKind.QUALIFICATION ||
          doc.kind === IndividualDocumentKind.CERTIFICATE,
      )
      .map((doc) => ({
        kind: doc.kind as "qualification" | "certificate",
        originalFilename: doc.originalFilename,
        label: doc.label,
      }));

    const extractedCv = profile.extractedCvData
      ? {
          candidateName: profile.extractedCvData.candidateName,
          summary: profile.extractedCvData.summary,
          skills: profile.extractedCvData.skills,
          experienceYears: profile.extractedCvData.experienceYears,
          education: profile.extractedCvData.education,
          certifications: profile.extractedCvData.certifications,
          professionalRegistrations: profile.extractedCvData.professionalRegistrations,
          saQualifications: profile.extractedCvData.saQualifications,
          location: profile.extractedCvData.location,
        }
      : null;

    return this.metrics.time(METRIC_CATEGORY, "cv-improvements", async () => {
      const prompt = seekerCvImprovementPrompt({
        cvText: profile.rawCvText,
        extractedCv,
        supportingDocuments,
      });
      const result = await this.callAi(prompt);
      return parseNixJson<NixSeekerCvAssessmentResponse>(result.content);
    });
  }

  async generateCv(userId: number): Promise<NixGeneratedCv> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException("CV Assistant profile not found");
    }
    if (profile.userType !== AnnixOrbitUserType.INDIVIDUAL) {
      throw new BadRequestException("Nix CV builder is only for individual job seekers.");
    }
    if (!profile.cvFilePath) {
      throw new BadRequestException(
        "Upload your CV first — Nix needs at least your CV before it can build an improved version.",
      );
    }
    if (!profile.rawCvText || profile.rawCvText.trim().length === 0) {
      throw new BadRequestException(
        "We couldn't read any text from your CV file. If it is a scanned image, please re-upload a text-based PDF, Word, or Excel version.",
      );
    }

    const documents = await this.documentRepo.findByProfileOrdered(profile.id);

    const supportingDocuments = documents
      .filter(
        (doc) =>
          doc.kind === IndividualDocumentKind.QUALIFICATION ||
          doc.kind === IndividualDocumentKind.CERTIFICATE,
      )
      .map((doc) => ({
        kind: doc.kind as "qualification" | "certificate",
        originalFilename: doc.originalFilename,
        label: doc.label,
      }));

    const extractedCv = profile.extractedCvData
      ? {
          candidateName: profile.extractedCvData.candidateName,
          summary: profile.extractedCvData.summary,
          skills: profile.extractedCvData.skills,
          experienceYears: profile.extractedCvData.experienceYears,
          education: profile.extractedCvData.education,
          certifications: profile.extractedCvData.certifications,
          professionalRegistrations: profile.extractedCvData.professionalRegistrations,
          saQualifications: profile.extractedCvData.saQualifications,
          location: profile.extractedCvData.location,
        }
      : null;

    const generated = await this.metrics.time(METRIC_CATEGORY, "cv-generation", async () => {
      const prompt = seekerCvGenerationPrompt({
        cvText: profile.rawCvText,
        extractedCv,
        supportingDocuments,
      });
      const aiResult = await this.callAi(prompt);
      return parseNixJson<NixGeneratedCv>(aiResult.content);
    });

    const result = dedupeExperienceLocations(generated);
    profile.nixGeneratedCv = result;
    profile.nixGeneratedCvAt = now().toJSDate();
    await this.profileRepo.save(profile);

    return result;
  }

  async generatedCv(
    userId: number,
  ): Promise<{ cv: NixGeneratedCv | null; generatedAt: string | null }> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException("CV Assistant profile not found");
    }
    const generatedAt = profile.nixGeneratedCvAt ? profile.nixGeneratedCvAt.toISOString() : null;
    return { cv: profile.nixGeneratedCv, generatedAt };
  }

  async updateGeneratedCv(userId: number, cv: NixGeneratedCv): Promise<NixGeneratedCv> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) {
      throw new BadRequestException("CV Assistant profile not found");
    }
    if (profile.userType !== AnnixOrbitUserType.INDIVIDUAL) {
      throw new BadRequestException("Nix CV builder is only for individual job seekers.");
    }
    if (!profile.nixGeneratedCv) {
      throw new BadRequestException("Generate your CV with Nix before editing it.");
    }
    profile.nixGeneratedCv = cv;
    profile.nixGeneratedCvAt = now().toJSDate();
    await this.profileRepo.save(profile);
    return cv;
  }

  async calendarAdvisory(
    conflicts: NixCalendarAdvisoryConflict[],
  ): Promise<NixCalendarAdvisoryResponse> {
    if (conflicts.length === 0) {
      return { advisories: [] };
    }
    return this.metrics.time(METRIC_CATEGORY, "calendar-advisory", async () => {
      const prompt = calendarAdvisoryPrompt(conflicts);
      const result = await this.callAi(prompt);
      return parseNixJson<NixCalendarAdvisoryResponse>(result.content);
    });
  }

  async analyzeCredentialPhoto(
    buffer: Buffer,
    mimeType: string,
    kind: "qualification" | "certificate",
  ): Promise<{ fields: CredentialFields; label: string | null; readable: boolean }> {
    const mediaType = credentialPhotoMediaType(mimeType);
    if (!mediaType) {
      return { fields: EMPTY_CREDENTIAL_FIELDS, label: null, readable: false };
    }
    const base64 = buffer.toString("base64");
    try {
      const result = await this.metrics.time(
        METRIC_CATEGORY,
        "credential-photo",
        async () => {
          const learned = await this.credentialCorrectionExamples();
          const prompt = credentialPhotoPrompt(kind, learned);
          const ai = await this.aiChatService.chatWithImage(
            base64,
            mediaType,
            prompt.user,
            prompt.system,
            { responseFormat: "json" },
          );
          return parseNixJson<NixCredentialPhotoResult>(ai.content);
        },
        buffer.length,
      );
      const fields: CredentialFields = {
        credentialName: result.credentialName ?? null,
        issuer: result.issuer ?? null,
        dateAwarded: result.dateAwarded ?? null,
        nqfLevel: result.nqfLevel ?? null,
        expiry: result.expiry ?? null,
      };
      return { fields, label: credentialPhotoLabel(result), readable: result.readable !== false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Credential photo analysis failed: ${message}`);
      return { fields: EMPTY_CREDENTIAL_FIELDS, label: null, readable: false };
    }
  }

  private async callAi(prompt: { system: string; user: string }) {
    try {
      return await this.aiChatService.chat([{ role: "user", content: prompt.user }], prompt.system);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Nix seeker AI call failed: ${message}`);
      throw new ServiceUnavailableException("Nix is having a moment — try again in a few seconds.");
    }
  }
}
