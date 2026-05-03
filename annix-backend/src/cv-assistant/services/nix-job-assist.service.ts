import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { JobPosting } from "../entities/job-posting.entity";
import {
  descriptionPrompt,
  type NixDescriptionResponse,
  type NixSkillSuggestionsResponse,
  type NixTitleSuggestionsResponse,
  parseNixJson,
  skillSuggestionsPrompt,
  summariseSuccessMetrics,
  titleSuggestionsPrompt,
} from "./nix-prompts";

const METRIC_CATEGORY = "cv-assistant-nix";

@Injectable()
export class NixJobAssistService {
  private readonly logger = new Logger(NixJobAssistService.name);

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
  ) {}

  async titleSuggestions(
    companyId: number,
    jobPostingId: number,
    titleOverride?: string,
  ): Promise<NixTitleSuggestionsResponse> {
    const posting = await this.loadPosting(companyId, jobPostingId);
    const title = titleOverride?.trim() || posting.title;
    if (!title || title === "Untitled draft") {
      throw new NotFoundException("Set a title before asking for suggestions");
    }

    return this.metrics.time(METRIC_CATEGORY, "title-suggestions", async () => {
      const prompt = titleSuggestionsPrompt(title);
      const result = await this.callAi(prompt);
      return parseNixJson<NixTitleSuggestionsResponse>(result.content);
    });
  }

  async description(companyId: number, jobPostingId: number): Promise<NixDescriptionResponse> {
    const posting = await this.loadPostingWithRelations(companyId, jobPostingId);
    const { in3, in12 } = summariseSuccessMetrics(posting);

    const skills = (posting.skills || []).map((s) => ({
      name: s.name,
      importance: s.importance,
      proficiency: s.proficiency,
    }));

    return this.metrics.time(METRIC_CATEGORY, "description", async () => {
      const prompt = descriptionPrompt({
        title: posting.title,
        industry: posting.industry,
        city: posting.location,
        province: posting.province,
        seniorityLevel: posting.seniorityLevel,
        workMode: posting.workMode,
        employmentType: posting.employmentType,
        mainPurpose: posting.mainPurpose,
        companyContext: posting.companyContext,
        successIn3Months: in3,
        successIn12Months: in12,
        skills,
      });
      const result = await this.callAi(prompt);
      return parseNixJson<NixDescriptionResponse>(result.content);
    });
  }

  async skillSuggestions(
    companyId: number,
    jobPostingId: number,
  ): Promise<NixSkillSuggestionsResponse> {
    const posting = await this.loadPostingWithRelations(companyId, jobPostingId);
    const { in3, in12 } = summariseSuccessMetrics(posting);
    const existingSkills = (posting.skills || []).map((s) => ({ name: s.name }));

    return this.metrics.time(METRIC_CATEGORY, "skill-suggestions", async () => {
      const prompt = skillSuggestionsPrompt({
        title: posting.title,
        industry: posting.industry,
        seniorityLevel: posting.seniorityLevel,
        mainPurpose: posting.mainPurpose,
        successIn3Months: in3,
        successIn12Months: in12,
        existingSkills,
      });
      const result = await this.callAi(prompt);
      return parseNixJson<NixSkillSuggestionsResponse>(result.content);
    });
  }

  private async loadPosting(companyId: number, id: number): Promise<JobPosting> {
    const posting = await this.jobPostingRepo.findOne({ where: { id, companyId } });
    if (!posting) throw new NotFoundException("Job posting not found");
    return posting;
  }

  private async loadPostingWithRelations(companyId: number, id: number): Promise<JobPosting> {
    const posting = await this.jobPostingRepo.findOne({
      where: { id, companyId },
      relations: ["skills", "successMetrics"],
    });
    if (!posting) throw new NotFoundException("Job posting not found");
    return posting;
  }

  private async callAi(prompt: { system: string; user: string }) {
    try {
      return await this.aiChatService.chat([{ role: "user", content: prompt.user }], prompt.system);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Nix AI call failed: ${message}`);
      throw new ServiceUnavailableException("Nix is having a moment — try again in a few seconds.");
    }
  }
}
