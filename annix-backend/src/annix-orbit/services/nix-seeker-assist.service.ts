import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IndividualDocumentKind } from "../entities/annix-orbit-individual-document.entity";
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
  ) {}

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
  ): Promise<{ label: string | null; readable: boolean }> {
    const mediaType = credentialPhotoMediaType(mimeType);
    if (!mediaType) {
      return { label: null, readable: false };
    }
    const base64 = buffer.toString("base64");
    try {
      const result = await this.metrics.time(
        METRIC_CATEGORY,
        "credential-photo",
        async () => {
          const prompt = credentialPhotoPrompt(kind);
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
      return { label: credentialPhotoLabel(result), readable: result.readable !== false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Credential photo analysis failed: ${message}`);
      return { label: null, readable: false };
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
