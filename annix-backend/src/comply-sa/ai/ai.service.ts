import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";

export interface ChatResponse {
  answer: string;
  relatedRequirements: string[];
}

interface TopicMatch {
  keywords: string[];
  guidance: string;
  requirements: string[];
  statusField: string | null;
}

const TOPIC_MATCHES: TopicMatch[] = [
  {
    keywords: ["cipc"],
    guidance:
      "CIPC Annual Returns must be filed within 30 business days after the anniversary of your company's registration date. " +
      "You can file online at www.cipc.co.za. Late filing attracts penalties and may lead to deregistration. " +
      "Ensure your beneficial ownership register is also up to date, as CIPC now enforces a hard stop for non-compliant companies.",
    requirements: ["CIPC_ANNUAL_RETURN", "CIPC_BENEFICIAL_OWNERSHIP"],
    statusField: "corporate",
  },
  {
    keywords: ["popia", "privacy"],
    guidance:
      "POPIA (Protection of Personal Information Act) requires all organisations processing personal information to: " +
      "1) Appoint an Information Officer and register with the Information Regulator, " +
      "2) Conduct a personal information impact assessment, " +
      "3) Implement appropriate security safeguards, " +
      "4) Develop a PAIA manual, " +
      "5) Ensure lawful processing with consent or other justification. " +
      "Non-compliance can result in fines up to R10 million or imprisonment.",
    requirements: ["POPIA_REGISTRATION", "POPIA_COMPLIANCE"],
    statusField: "privacy",
  },
  {
    keywords: ["vat"],
    guidance:
      "VAT Registration is mandatory once your taxable turnover exceeds R1 million in a 12-month period (increasing to R2.3 million from April 2026). " +
      "Once registered, you must file VAT returns (VAT201) every two months. " +
      "Late submissions attract penalties of 10% of the amount due, plus interest. " +
      "Voluntary registration is possible if turnover exceeds R50,000.",
    requirements: ["SARS_VAT_REGISTRATION", "SARS_VAT_RETURNS"],
    statusField: "tax",
  },
  {
    keywords: ["bee", "b-bbee"],
    guidance:
      "B-BBEE (Broad-Based Black Economic Empowerment) levels are determined by a scorecard measuring: " +
      "Ownership, Management Control, Skills Development, Enterprise and Supplier Development, and Socio-Economic Development. " +
      "EMEs (turnover under R10m) automatically qualify for Level 4, or Level 1 if 100% Black-owned. " +
      "QSEs (R10m-R50m) use the QSE scorecard. " +
      "Generic enterprises (over R50m) require full verification by an accredited agency.",
    requirements: ["BBEE_CERTIFICATE", "BBEE_AFFIDAVIT"],
    statusField: "corporate",
  },
  {
    keywords: ["minimum wage", "salary"],
    guidance:
      "The National Minimum Wage increased to R30.23 per hour from 1 March 2026. " +
      "This applies to all workers except those in expanded public works programmes. " +
      "Employers must display the minimum wage at the workplace and keep records. " +
      "Non-compliance can result in fines and Labour Court orders.",
    requirements: ["MINIMUM_WAGE"],
    statusField: "labour",
  },
  {
    keywords: ["uif"],
    guidance:
      "UIF (Unemployment Insurance Fund) registration is mandatory for all employers. " +
      "Contributions are 2% of each employee's remuneration (1% employer, 1% employee), " +
      "capped at the maximum insurable earnings ceiling. " +
      "Monthly declarations (UI-19) must be submitted to the Department of Labour. " +
      "Late submissions attract penalties.",
    requirements: ["UIF_REGISTRATION", "UIF_CONTRIBUTIONS"],
    statusField: "labour",
  },
  {
    keywords: ["tax"],
    guidance:
      "Key tax compliance obligations for SA companies include: " +
      "1) Company Income Tax (IT14) - filed annually within 12 months of financial year end, " +
      "2) Provisional Tax (IRP6) - twice-yearly estimated payments, " +
      "3) PAYE - monthly employee tax deductions submitted by the 7th, " +
      "4) VAT - bi-monthly returns if registered, " +
      "5) Skills Development Levy (SDL) - 1% of payroll if exceeding R500,000. " +
      "Register for eFiling at www.sars.gov.za for electronic submission.",
    requirements: ["SARS_INCOME_TAX", "SARS_PROVISIONAL_TAX", "SARS_PAYE", "SARS_VAT_REGISTRATION"],
    statusField: "tax",
  },
  {
    keywords: ["ohs", "safety"],
    guidance:
      "The Occupational Health and Safety Act (OHS Act 85 of 1993) requires employers to: " +
      "1) Provide and maintain a safe working environment, " +
      "2) Appoint health and safety representatives (1 per 20 employees), " +
      "3) Establish a health and safety committee (if 20+ employees), " +
      "4) Report workplace incidents to the Department of Employment and Labour, " +
      "5) Display the OHS Act summary at the workplace. " +
      "Non-compliance can result in fines or criminal prosecution.",
    requirements: ["OHS_COMPLIANCE", "OHS_REGISTRATION"],
    statusField: "safety",
  },
];

const DEFAULT_ANSWER =
  "I can help with CIPC, SARS, POPIA, B-BBEE, labour law, and OHS compliance questions. Please ask about a specific topic.";

@Injectable()
export class ComplySaAiService {
  constructor(
    @InjectRepository(ComplySaCompany)
    private readonly companyRepository: Repository<ComplySaCompany>,
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
  ) {}

  async chat(companyId: number, question: string): Promise<ChatResponse> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const lowerQuestion = question.toLowerCase();

    const matchedTopic = TOPIC_MATCHES.find((topic) =>
      topic.keywords.some((keyword) => lowerQuestion.includes(keyword)),
    );

    if (matchedTopic === null || matchedTopic === undefined) {
      return {
        answer: DEFAULT_ANSWER,
        relatedRequirements: [],
      };
    }

    const statuses = await this.statusRepository.find({
      where: { companyId },
      relations: ["requirement"],
    });

    const relevantStatuses = statuses.filter((s) =>
      matchedTopic.requirements.includes(s.requirement?.code ?? ""),
    );

    const statusSummary =
      relevantStatuses.length > 0
        ? "\n\nYour company's current status:\n" +
          relevantStatuses
            .map(
              (s) =>
                `- ${s.requirement?.name ?? "Unknown"}: ${s.status}${s.nextDueDate !== null ? ` (due: ${s.nextDueDate})` : ""}`,
            )
            .join("\n")
        : "";

    return {
      answer: matchedTopic.guidance + statusSummary,
      relatedRequirements: matchedTopic.requirements,
    };
  }
}
