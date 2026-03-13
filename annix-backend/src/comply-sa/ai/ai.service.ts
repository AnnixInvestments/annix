import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { formatDateZA, fromJSDate } from "../lib/datetime";

export interface ChatResponse {
  answer: string;
  relatedRequirements: string[];
  providerUsed: string;
}

const SYSTEM_PROMPT = [
  "You are the Comply SA compliance assistant, an expert on South African business compliance and regulations.",
  "You help SME owners understand and meet their compliance obligations across CIPC, SARS, POPIA, B-BBEE, Labour, and OHS.",
  "",
  "Key SA regulatory knowledge:",
  "- CIPC: Annual returns within 30 days of anniversary, beneficial ownership disclosure mandatory since July 2024",
  "- SARS Income Tax: Companies taxed at 27%, ITR14 due within 12 months of financial year end",
  "- SARS VAT: Mandatory if turnover > R2.3m (from Apr 2026), voluntary > R120k, returns due 25th of submission month",
  "- SARS PAYE/UIF/SDL: EMP201 monthly by 7th, EMP501 bi-annual reconciliation",
  "- POPIA: Information Officer registration, privacy policy, PAIA manual required. Fines up to R10m or 10 years",
  "- B-BBEE: EME (<R10m) automatic Level 4 (Level 1 if 100% black-owned), QSE (R10m-R50m), Generic (>R50m) needs verification",
  "- UIF: 2% contribution (split employer/employee), ceiling R17,712/month",
  "- COIDA: Return of Earnings by 31 March, minimum assessment R1,621",
  "- Employment Equity: Annual reports by 15 Jan for designated employers (50+ employees from Jan 2025)",
  "- Minimum Wage: R30.23/hour from March 2026, overtime at 1.5x",
  "- OHS: Safety file monthly review, H&S reps for 20+ staff, incident reporting within 14 days",
  "",
  "Always answer in the context of South African law. Be specific about deadlines, penalties, and actionable steps.",
  "If the user's company profile or compliance status is provided, tailor your answer to their specific situation.",
  "Keep answers concise but thorough. Use bullet points for action items.",
].join("\n");

@Injectable()
export class ComplySaAiService {
  private readonly logger = new Logger(ComplySaAiService.name);

  constructor(
    @InjectRepository(ComplySaCompany)
    private readonly companyRepository: Repository<ComplySaCompany>,
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
    private readonly aiChatService: AiChatService,
  ) {}

  async chat(companyId: number, question: string): Promise<ChatResponse> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const statuses = await this.statusRepository.find({
      where: { companyId },
      relations: ["requirement"],
    });

    const contextParts = [
      `Company: ${company.name}`,
      company.industry !== null ? `Industry: ${company.industry}` : null,
      company.employeeCount !== null ? `Employees: ${company.employeeCount}` : null,
      company.annualTurnover !== null ? `Annual Turnover: R${company.annualTurnover}` : null,
      company.vatRegistered ? "VAT Registered: Yes" : "VAT Registered: No",
      company.province !== null ? `Province: ${company.province}` : null,
    ].filter((part): part is string => part !== null);

    const statusSummary =
      statuses.length > 0
        ? [
            "",
            "Current compliance status:",
            ...statuses.map(
              (s) =>
                `- ${s.requirement?.name ?? "Unknown"}: ${s.status}${s.nextDueDate !== null ? ` (due: ${formatDateZA(fromJSDate(s.nextDueDate))})` : ""}`,
            ),
          ]
        : [];

    const fullSystemPrompt = [
      SYSTEM_PROMPT,
      "",
      "Company context:",
      ...contextParts,
      ...statusSummary,
    ].join("\n");

    const relatedRequirements = this.identifyRelatedRequirements(question, statuses);

    try {
      const result = await this.aiChatService.chat(
        [{ role: "user", content: question }],
        fullSystemPrompt,
      );

      return {
        answer: result.content,
        relatedRequirements,
        providerUsed: result.providerUsed,
      };
    } catch (error) {
      this.logger.error(
        `AI chat failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        answer:
          "I apologise, but I am unable to process your question right now. Please try again shortly, or browse the compliance requirements on your dashboard for guidance.",
        relatedRequirements,
        providerUsed: "none",
      };
    }
  }

  private identifyRelatedRequirements(
    question: string,
    statuses: ComplySaComplianceStatus[],
  ): string[] {
    const lowerQuestion = question.toLowerCase();

    const keywordMap: Record<string, string[]> = {
      cipc: ["CIPC_ANNUAL_RETURN", "CIPC_BENEFICIAL_OWNERSHIP"],
      "annual return": ["CIPC_ANNUAL_RETURN"],
      popia: ["POPIA_INFORMATION_OFFICER", "POPIA_PRIVACY_POLICY", "POPIA_PAIA_MANUAL"],
      privacy: ["POPIA_INFORMATION_OFFICER", "POPIA_PRIVACY_POLICY"],
      vat: ["SARS_VAT_REGISTRATION", "SARS_VAT_RETURNS"],
      "b-bbee": ["BBEE_EME_AFFIDAVIT", "BBEE_QSE_AFFIDAVIT", "BBEE_GENERIC_VERIFICATION"],
      bee: ["BBEE_EME_AFFIDAVIT", "BBEE_QSE_AFFIDAVIT", "BBEE_GENERIC_VERIFICATION"],
      tax: ["SARS_INCOME_TAX", "SARS_PROVISIONAL_TAX", "SARS_TURNOVER_TAX"],
      paye: ["SARS_EMP201"],
      uif: ["UIF_REGISTRATION"],
      coida: ["COIDA_REGISTRATION"],
      "minimum wage": ["MINIMUM_WAGE"],
      salary: ["MINIMUM_WAGE"],
      ohs: ["OHS_SAFETY_FILE", "OHS_INCIDENT_REPORTING"],
      safety: ["OHS_SAFETY_FILE", "OHS_INCIDENT_REPORTING"],
      "employment equity": ["EE_REPORTING"],
      sdl: ["SDL_ASSESSMENT"],
    };

    const matchedCodes = new Set(
      Object.entries(keywordMap)
        .filter(([keyword]) => lowerQuestion.includes(keyword))
        .flatMap(([, codes]) => codes),
    );

    return statuses
      .filter((s) => matchedCodes.has(s.requirement?.code ?? ""))
      .map((s) => s.requirement?.code ?? "")
      .filter((code) => code.length > 0);
  }
}
