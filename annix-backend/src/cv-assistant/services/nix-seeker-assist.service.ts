import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  CvAssistantIndividualDocument,
  IndividualDocumentKind,
} from "../entities/cv-assistant-individual-document.entity";
import { CvAssistantProfile, CvAssistantUserType } from "../entities/cv-assistant-profile.entity";
import {
  type NixSeekerCvAssessmentResponse,
  parseNixJson,
  seekerCvImprovementPrompt,
} from "./nix-prompts";

const METRIC_CATEGORY = "cv-assistant-nix-seeker";

@Injectable()
export class NixSeekerAssistService {
  private readonly logger = new Logger(NixSeekerAssistService.name);

  constructor(
    @InjectRepository(CvAssistantProfile)
    private readonly profileRepo: Repository<CvAssistantProfile>,
    @InjectRepository(CvAssistantIndividualDocument)
    private readonly documentRepo: Repository<CvAssistantIndividualDocument>,
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async cvImprovements(userId: number): Promise<NixSeekerCvAssessmentResponse> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new BadRequestException("CV Assistant profile not found");
    }
    if (profile.userType !== CvAssistantUserType.INDIVIDUAL) {
      throw new BadRequestException("Nix Wizard CV review is only for individual job seekers.");
    }
    if (!profile.cvFilePath) {
      throw new BadRequestException(
        "Upload your CV first — Nix needs at least your CV before it can suggest improvements.",
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
