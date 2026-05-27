import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  AnnixOrbitIndividualDocument,
  IndividualDocumentKind,
} from "../entities/annix-orbit-individual-document.entity";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import {
  calendarAdvisoryPrompt,
  type NixCalendarAdvisoryConflict,
  type NixCalendarAdvisoryResponse,
  type NixGeneratedCv,
  type NixSeekerCvAssessmentResponse,
  parseNixJson,
  seekerCvGenerationPrompt,
  seekerCvImprovementPrompt,
} from "./nix-prompts";

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
    @InjectRepository(AnnixOrbitProfile)
    private readonly profileRepo: Repository<AnnixOrbitProfile>,
    @InjectRepository(AnnixOrbitIndividualDocument)
    private readonly documentRepo: Repository<AnnixOrbitIndividualDocument>,
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async cvImprovements(userId: number): Promise<NixSeekerCvAssessmentResponse> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new BadRequestException("Annix Orbit profile not found");
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

    const documents = await this.documentRepo.find({
      where: { profileId: profile.id },
      order: { uploadedAt: "DESC" },
    });

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
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new BadRequestException("Annix Orbit profile not found");
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

    const documents = await this.documentRepo.find({
      where: { profileId: profile.id },
      order: { uploadedAt: "DESC" },
    });

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
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new BadRequestException("Annix Orbit profile not found");
    }
    const generatedAt = profile.nixGeneratedCvAt ? profile.nixGeneratedCvAt.toISOString() : null;
    return { cv: profile.nixGeneratedCv, generatedAt };
  }

  async updateGeneratedCv(userId: number, cv: NixGeneratedCv): Promise<NixGeneratedCv> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new BadRequestException("Annix Orbit profile not found");
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
