import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import {
  CvAssistantEmailTemplate,
  CvEmailTemplateKind,
} from "../entities/cv-assistant-email-template.entity";
import {
  defaultByKind,
  EMAIL_TEMPLATE_DEFAULTS,
  type EmailTemplateDefinition,
  renderTemplate,
} from "./email-template-defaults";

export interface ResolvedTemplate {
  kind: CvEmailTemplateKind;
  label: string;
  description: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  placeholders: string[];
  isCustomised: boolean;
  updatedAt: Date | null;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    @InjectRepository(CvAssistantEmailTemplate)
    private readonly templateRepo: Repository<CvAssistantEmailTemplate>,
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    private readonly aiChatService: AiChatService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Resolve the company's template for the given kind, render the placeholders
   * with the supplied vars, then send via EmailService. Returns true when the
   * email was successfully dispatched.
   */
  async renderAndSend(input: {
    companyId: number;
    kind: CvEmailTemplateKind;
    to: string;
    vars: Record<string, string | number | undefined | null>;
  }): Promise<boolean> {
    const template = await this.forCompany(input.companyId, input.kind);
    const subject = renderTemplate(template.subject, input.vars);
    const html = renderTemplate(template.bodyHtml, input.vars);
    const text = renderTemplate(template.bodyText, input.vars);
    return this.emailService.sendEmail({
      to: input.to,
      subject,
      html,
      text,
      isTransactional: true,
    });
  }

  async listForCompany(companyId: number): Promise<ResolvedTemplate[]> {
    const customised = await this.templateRepo.find({ where: { companyId } });
    const customByKind = new Map(customised.map((t) => [t.kind, t]));
    return EMAIL_TEMPLATE_DEFAULTS.map((def) =>
      this.merge(def, customByKind.get(def.kind) ?? null),
    );
  }

  async forCompany(companyId: number, kind: CvEmailTemplateKind): Promise<ResolvedTemplate> {
    const def = defaultByKind(kind);
    const custom = await this.templateRepo.findOne({ where: { companyId, kind } });
    return this.merge(def, custom);
  }

  async update(
    companyId: number,
    kind: CvEmailTemplateKind,
    payload: { subject: string; bodyHtml: string; bodyText: string },
  ): Promise<ResolvedTemplate> {
    defaultByKind(kind);
    const existing = await this.templateRepo.findOne({ where: { companyId, kind } });
    if (existing) {
      existing.subject = payload.subject;
      existing.bodyHtml = payload.bodyHtml;
      existing.bodyText = payload.bodyText;
      await this.templateRepo.save(existing);
    } else {
      const created = this.templateRepo.create({
        companyId,
        kind,
        subject: payload.subject,
        bodyHtml: payload.bodyHtml,
        bodyText: payload.bodyText,
      });
      await this.templateRepo.save(created);
    }
    return this.forCompany(companyId, kind);
  }

  async resetToDefault(companyId: number, kind: CvEmailTemplateKind): Promise<ResolvedTemplate> {
    defaultByKind(kind);
    await this.templateRepo.delete({ companyId, kind });
    return this.forCompany(companyId, kind);
  }

  async draftWithNix(
    companyId: number,
    kind: CvEmailTemplateKind,
    instructions?: string,
  ): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
    const def = defaultByKind(kind);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException("Company not found");

    const prompt = this.buildNixPrompt(def, company.name ?? "the hiring team", instructions);

    try {
      const result = await this.aiChatService.chat(
        [{ role: "user", content: prompt.user }],
        prompt.system,
      );
      return this.parseNixResponse(result.content, def);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Nix email-template draft failed: ${message}`);
      throw new ServiceUnavailableException("Nix is having a moment — try again in a few seconds.");
    }
  }

  private merge(
    def: EmailTemplateDefinition,
    custom: CvAssistantEmailTemplate | null,
  ): ResolvedTemplate {
    if (!custom) {
      return {
        kind: def.kind,
        label: def.label,
        description: def.description,
        subject: def.subject,
        bodyHtml: def.bodyHtml,
        bodyText: def.bodyText,
        placeholders: def.placeholders,
        isCustomised: false,
        updatedAt: null,
      };
    }
    return {
      kind: def.kind,
      label: def.label,
      description: def.description,
      subject: custom.subject,
      bodyHtml: custom.bodyHtml,
      bodyText: custom.bodyText,
      placeholders: def.placeholders,
      isCustomised: true,
      updatedAt: custom.updatedAt,
    };
  }

  private buildNixPrompt(
    def: EmailTemplateDefinition,
    companyName: string,
    instructions?: string,
  ): { system: string; user: string } {
    const system =
      "You are Nix, the AI hiring assistant inside the Annix CV Assistant. " +
      "You help South African employers draft candidate-facing emails that are professional, clear and warm. " +
      "Always respond with strict JSON only — no markdown, no commentary, no code fences.";

    const placeholdersList = def.placeholders.map((p) => `{{${p}}}`).join(", ");
    const user = `Draft a candidate-facing email template for the "${def.label}" purpose.

Context:
- Company: ${companyName}
- Email purpose: ${def.description}
- Available placeholders (must reference these literally — do not substitute values): ${placeholdersList}
${instructions ? `- Additional guidance from the user: ${instructions}` : ""}

Return JSON with this exact shape:
{
  "subject": "string — clear, under 80 characters, can include placeholders",
  "bodyHtml": "string — HTML email body. Wrap paragraphs in <p>. No <html>/<head>/<body>/<style> tags. Polite, plain English, South-African business tone.",
  "bodyText": "string — plain-text equivalent of the bodyHtml for email clients that don't render HTML. Same content, no tags."
}

Rules:
- Use {{placeholder}} syntax exactly. The system substitutes them at send time.
- Keep the body to 3-5 short paragraphs maximum.
- Be respectful and human — avoid corporate jargon, robotic phrasing, or US-isms.
- For rejections: be kind and brief; do not list shortcomings.
- For shortlist/acceptance: be warm but reserved; the user will follow up with logistics separately.
- For reference requests: be specific about what the reference is being asked to do and how long it'll take.
- Never invent facts (salary, start date, contract terms) — leave those for the human follow-up.`;

    return { system, user };
  }

  private parseNixResponse(
    content: string,
    def: EmailTemplateDefinition,
  ): { subject: string; bodyHtml: string; bodyText: string } {
    const cleaned = content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Nix did not return a JSON object");
    }
    const raw = JSON.parse(match[0]) as Record<string, unknown>;
    const subject = typeof raw.subject === "string" ? raw.subject.slice(0, 240) : def.subject;
    const bodyHtml = typeof raw.bodyHtml === "string" ? raw.bodyHtml : def.bodyHtml;
    const bodyText = typeof raw.bodyText === "string" ? raw.bodyText : def.bodyText;
    return { subject, bodyHtml, bodyText };
  }
}
