import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "../../email/email.service";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  DraftAnnixOrbitMessageDto,
  SendAnnixOrbitMessageDto,
} from "../dto/annix-orbit-message.dto";

const TEMPLATE_INTENTS: Record<string, string> = {
  request_documents:
    "Ask the candidate to send outstanding compliance documents (e.g. ID, qualifications, references) so we can progress their application.",
  invite_interview:
    "Invite the candidate to an interview, ask for their availability, and sound positive and professional.",
  send_shortlist:
    "Write a short note to a client introducing a shortlist of candidates attached/submitted for their role.",
  follow_up: "Politely follow up with the recipient on a previous message or submission.",
  polite_reject:
    "Let the candidate know, kindly and respectfully, that they were not successful this time, and encourage them to stay in touch.",
};

@Injectable()
export class AnnixOrbitMessageService {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async draft(dto: DraftAnnixOrbitMessageDto): Promise<{ body: string }> {
    return this.metrics.time("annix-orbit-recruiter", "message-draft", () => this.draftInner(dto));
  }

  private async draftInner(dto: DraftAnnixOrbitMessageDto): Promise<{ body: string }> {
    const intentKey = dto.templateKey;
    const intent = TEMPLATE_INTENTS[intentKey] || "Write a professional recruitment message.";
    const contextLines = [
      dto.candidateName ? `Candidate: ${dto.candidateName}` : null,
      dto.role ? `Role: ${dto.role}` : null,
      dto.notes ? `Additional context: ${dto.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt =
      "You are a professional South African recruitment consultant. Write a concise, warm, professional message body only — no subject line, no placeholders in square brackets, no preamble or sign-off beyond a simple closing. Keep it under 180 words.";
    const userContent = `${intent}\n\n${contextLines}`.trim();

    const { content } = await this.aiChatService.chat(
      [{ role: "user", content: userContent }],
      systemPrompt,
    );
    return { body: content.trim() };
  }

  async send(dto: SendAnnixOrbitMessageDto): Promise<{ sent: boolean; simulated: boolean }> {
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";
    if (!isProduction) {
      return { sent: false, simulated: true };
    }
    const ok = await this.emailService.sendEmail({
      to: dto.to,
      subject: dto.subject,
      text: dto.body,
      html: dto.body.replace(/\n/g, "<br/>"),
      isTransactional: false,
    });
    return { sent: ok, simulated: false };
  }
}
