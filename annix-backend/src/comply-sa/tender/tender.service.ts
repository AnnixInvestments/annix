import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaDocument } from "../comply-documents/entities/document.entity";

export interface TenderDocument {
  name: string;
  description: string;
  status: "uploaded" | "missing";
  documentId: number | null;
}

const REQUIRED_TENDER_DOCUMENTS: { name: string; description: string }[] = [
  {
    name: "Tax Clearance Certificate",
    description:
      "Valid SARS Tax Compliance Status (TCS) pin or certificate confirming good standing with SARS.",
  },
  {
    name: "B-BBEE Certificate/Affidavit",
    description:
      "B-BBEE verification certificate from an accredited agency, or a sworn EME/QSE affidavit.",
  },
  {
    name: "CIPC Registration",
    description: "Company registration documents from CIPC, including the CoR14.3 or equivalent.",
  },
  {
    name: "Company Profile",
    description:
      "Detailed company profile including history, capabilities, key personnel, and references.",
  },
  {
    name: "COIDA Letter of Good Standing",
    description: "Letter of Good Standing from the Compensation Fund confirming COIDA compliance.",
  },
  {
    name: "Bank Confirmation Letter",
    description: "Original bank confirmation letter on bank letterhead, not older than 3 months.",
  },
  {
    name: "Proof of Address",
    description:
      "Utility bill or rates account not older than 3 months confirming business address.",
  },
  {
    name: "Director ID Copies",
    description: "Certified copies of identity documents for all company directors.",
  },
];

@Injectable()
export class ComplySaTenderService {
  constructor(
    @InjectRepository(ComplySaCompany)
    private readonly companyRepository: Repository<ComplySaCompany>,
    @InjectRepository(ComplySaDocument)
    private readonly documentRepository: Repository<ComplySaDocument>,
  ) {}

  async requiredDocuments(companyId: number): Promise<TenderDocument[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const companyDocuments = await this.documentRepository.find({
      where: { companyId },
    });

    return REQUIRED_TENDER_DOCUMENTS.map((required) => {
      const lowerName = required.name.toLowerCase();
      const matchedDoc = companyDocuments.find(
        (doc) =>
          doc.name.toLowerCase().includes(lowerName) || lowerName.includes(doc.name.toLowerCase()),
      );

      if (matchedDoc != null) {
        return {
          name: required.name,
          description: required.description,
          status: "uploaded" as const,
          documentId: matchedDoc.id,
        };
      } else {
        return {
          name: required.name,
          description: required.description,
          status: "missing" as const,
          documentId: null,
        };
      }
    });
  }

  async complianceScore(companyId: number): Promise<{ score: number }> {
    const documents = await this.requiredDocuments(companyId);
    const totalCount = documents.length;
    const uploadedCount = documents.filter((d) => d.status === "uploaded").length;
    const score = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

    return { score };
  }
}
