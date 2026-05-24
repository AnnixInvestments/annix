import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import type { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { EducationAiAdviceLog } from "../entities/education-ai-advice-log.entity";
import type { EducationProfile } from "../entities/education-profile.entity";
import { EducationConsentService } from "./education-consent.service";
import { EducationProfileService } from "./education-profile.service";

const MENTOR_METRIC_CATEGORY = "orbit-education-mentor";

const MENTOR_SYSTEM_PROMPT = `You are the FuturePath mentor inside Annix Orbit — a grounded study, university and funding guide for learners.

Hard rules:
- Reason ONLY over the learner context provided below. Do not invent universities, courses, entry requirements, bursaries or deadlines that are not in the context.
- If the context does not contain what is needed to answer, say so plainly and suggest what information the learner should add to their profile.
- You are NOT a registered career counsellor. For high-stakes decisions, recommend the learner confirm with their school counsellor or the institution directly.
- Be encouraging, concrete and concise. Use the learner's curriculum and results to tailor guidance.`;

export interface MentorAnswer {
  answer: string;
  model: string;
  logId: string;
}

@Injectable()
export class EducationMentorService {
  private readonly logger = new Logger(EducationMentorService.name);

  constructor(
    @InjectRepository(EducationAiAdviceLog)
    private readonly adviceLogRepo: Repository<EducationAiAdviceLog>,
    private readonly profileService: EducationProfileService,
    private readonly consentService: EducationConsentService,
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async ask(educationProfileId: string, question: string): Promise<MentorAnswer> {
    const profile = await this.profileService.profileOrThrow(educationProfileId);
    await this.consentService.assertProcessingAllowed(profile);

    const grounding = await this.groundingContext(profile);
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Learner context (the ONLY facts you may rely on):\n${JSON.stringify(grounding, null, 2)}\n\nLearner question:\n${question}`,
      },
    ];

    const result = await this.metrics.time(
      MENTOR_METRIC_CATEGORY,
      profile.curriculum ?? "Other",
      () => this.aiChatService.chat(messages, MENTOR_SYSTEM_PROMPT),
    );

    const log = await this.adviceLogRepo.save(
      this.adviceLogRepo.create({
        educationProfileId,
        question,
        answer: result.content,
        groundingContext: grounding,
        model: result.providerUsed,
      }),
    );
    this.logger.log(`FuturePath mentor answered for profile ${educationProfileId} (log ${log.id})`);

    return { answer: result.content, model: result.providerUsed, logId: log.id };
  }

  private async groundingContext(profile: EducationProfile): Promise<Record<string, unknown>> {
    const results = await this.profileService.resultsForProfile(profile.id);
    return {
      curriculum: profile.curriculum,
      country: profile.country,
      nationality: profile.nationality,
      languages: profile.languages,
      school: profile.school,
      targetCategories: profile.targetCategories ?? [],
      academicResults: results.map((r) => ({
        subject: r.subject,
        mark: r.mark,
        predictedMark: r.predictedMark,
        year: r.year,
        term: r.term,
      })),
    };
  }
}
