import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { Company } from "../../platform/entities/company.entity";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { ComplySaCompanyDetails } from "../companies/entities/comply-sa-company-details.entity";
import { ComplySaComplianceRequirement } from "../compliance/entities/compliance-requirement.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { formatDateZA, fromJSDate } from "../lib/datetime";

export interface ChatResponse {
  answer: string;
  relatedRequirements: string[];
  providerUsed: string;
}

export interface DocumentAnalysisResult {
  completedStepIndices: number[];
  reasoning: string;
  vatSubmissionCycle?: "odd" | "even" | null;
}

type SupportedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

const SUPPORTED_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

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
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(ComplySaCompanyDetails)
    private readonly detailsRepository: Repository<ComplySaCompanyDetails>,
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
    @InjectRepository(ComplySaComplianceRequirement)
    private readonly requirementRepository: Repository<ComplySaComplianceRequirement>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async chat(companyId: number, question: string): Promise<ChatResponse> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const [statuses, details] = await Promise.all([
      this.statusRepository.find({
        where: { companyId },
        relations: ["requirement"],
      }),
      this.detailsRepository.findOne({ where: { companyId } }),
    ]);

    const contextParts = [
      `Company: ${company.name}`,
      company.industry !== null ? `Industry: ${company.industry}` : null,
      details !== null ? `Employees: ${details.employeeCount}` : null,
      details?.annualTurnover !== null ? `Annual Turnover: R${details?.annualTurnover}` : null,
      details?.vatRegistered ? "VAT Registered: Yes" : "VAT Registered: No",
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

  async analyzeDocumentForChecklist(
    filePath: string,
    mimeType: string | null,
    sizeBytes: number | null,
    requirementId: number,
  ): Promise<DocumentAnalysisResult> {
    const emptyResult: DocumentAnalysisResult = { completedStepIndices: [], reasoning: "" };

    if (mimeType === null || !SUPPORTED_MEDIA_TYPES.has(mimeType)) {
      this.logger.log(`Skipping AI analysis for unsupported mime type: ${mimeType}`);
      return emptyResult;
    }

    if (sizeBytes !== null && sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      this.logger.log(`Skipping AI analysis for oversized document: ${sizeBytes} bytes`);
      return emptyResult;
    }

    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId },
    });

    if (
      requirement === null ||
      requirement.checklistSteps === null ||
      requirement.checklistSteps.length === 0
    ) {
      return emptyResult;
    }

    const fileBuffer = await this.storageService.download(filePath);
    const base64 = fileBuffer.toString("base64");

    const numberedSteps = requirement.checklistSteps
      .map((step, index) => `${index}: "${step}"`)
      .join("\n");

    const isVatRelated =
      requirement.code === "SARS_VAT_RETURNS" || requirement.code === "SARS_VAT_REGISTRATION";

    const vatInstructions = isVatRelated
      ? [
          "",
          "IMPORTANT: This is a VAT-related document. Also determine the company's VAT submission cycle.",
          "In South Africa, VAT-registered companies submit VAT201 returns bi-monthly - either in odd months (Jan, Mar, May, Jul, Sep, Nov) or even months (Feb, Apr, Jun, Aug, Oct, Dec).",
          'Look for any indication of the submission period/cycle in the document. A VAT201 return filed in January, March, May etc. means the company is on "odd" months. Filed in February, April, June etc. means "even" months.',
          "A VAT registration notice may explicitly state the tax period category (Category A odd or even).",
          'Include "vatSubmissionCycle": "odd" or "even" in your response if you can determine it, or null if unclear.',
        ]
      : [];

    const responseFormat = isVatRelated
      ? '{ "completedStepIndices": [0, 2], "reasoning": "brief explanation", "vatSubmissionCycle": "odd" }'
      : '{ "completedStepIndices": [0, 2], "reasoning": "brief explanation" }';

    const prompt = [
      `A company has uploaded a document linked to the compliance requirement: "${requirement.name}".`,
      `Description: ${requirement.description}`,
      "",
      "The requirement has these checklist steps:",
      numberedSteps,
      "",
      "Analyze the uploaded document and determine which checklist steps this document provides evidence of completion for.",
      "",
      `Return JSON only: ${responseFormat}`,
      "",
      "Rules:",
      "- Only mark steps where the document provides clear evidence of completion",
      "- A filed return or receipt satisfies submission/payment steps",
      "- A registration certificate satisfies registration steps",
      "- Be conservative - only mark steps with strong evidence",
      "- Return an empty array if the document does not clearly satisfy any steps",
      ...vatInstructions,
    ].join("\n");

    const systemPrompt = [
      "You are a South African compliance document analyst.",
      "You analyze uploaded documents against compliance checklist steps and determine which steps the document satisfies.",
      "You must respond with valid JSON only, no markdown formatting.",
    ].join("\n");

    try {
      const result = await this.aiChatService.chatWithImage(
        base64,
        mimeType as SupportedMediaType,
        prompt,
        systemPrompt,
      );

      const cleaned = result.content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as {
        completedStepIndices?: number[];
        reasoning?: string;
        vatSubmissionCycle?: string;
      };

      const validIndices = (parsed.completedStepIndices || []).filter(
        (idx): idx is number =>
          typeof idx === "number" && idx >= 0 && idx < requirement.checklistSteps!.length,
      );

      const vatCycle =
        parsed.vatSubmissionCycle === "odd" || parsed.vatSubmissionCycle === "even"
          ? parsed.vatSubmissionCycle
          : null;

      return {
        completedStepIndices: validIndices,
        reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
        vatSubmissionCycle: vatCycle,
      };
    } catch (error) {
      this.logger.error(
        `AI document analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return emptyResult;
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
