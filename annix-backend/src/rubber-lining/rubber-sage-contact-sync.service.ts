import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { SageConnectionService } from "../sage-export/sage-connection.service";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";

interface SageContactMatch {
  companyId: number;
  companyName: string;
  sageContactId: number;
  sageContactName: string;
}

export interface SageContactSyncResult {
  matched: number;
  unmatched: number;
  alreadyMapped: number;
  newMappings: SageContactMatch[];
}

interface SuggestedMatch {
  sageId: number;
  sageName: string;
  confidence: number;
}

interface CompanyMappingEntry {
  id: number;
  name: string;
  companyType: string;
  sageContactId: number | null;
  sageContactName: string | null;
  suggestedMatches: SuggestedMatch[];
}

export interface SageContactMappingStatus {
  companies: CompanyMappingEntry[];
  summary: {
    total: number;
    mapped: number;
    unmapped: number;
  };
}

@Injectable()
export class RubberSageContactSyncService {
  private readonly logger = new Logger(RubberSageContactSyncService.name);

  constructor(
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
    private readonly sageConnectionService: SageConnectionService,
  ) {}

  async syncContacts(appKey: string): Promise<SageContactSyncResult> {
    const [sageSuppliers, sageCustomers, unmappedCompanies] = await Promise.all([
      this.sageConnectionService.sageSuppliers(appKey),
      this.sageConnectionService.sageCustomers(appKey),
      this.companyRepo.find({ where: { sageContactId: IsNull() } }),
    ]);

    const alreadyMapped = await this.companyRepo.count({
      where: [{ sageContactId: IsNull() as unknown as number }],
    });
    const totalCompanies = await this.companyRepo.count();
    const alreadyMappedCount = totalCompanies - unmappedCompanies.length;

    const newMappings: SageContactMatch[] = unmappedCompanies.reduce(
      (mappings: SageContactMatch[], company) => {
        const sageContacts =
          company.companyType === CompanyType.SUPPLIER ? sageSuppliers : sageCustomers;
        const contactType = company.companyType === CompanyType.SUPPLIER ? "SUPPLIER" : "CUSTOMER";

        const scored = sageContacts
          .filter((c) => c.Active)
          .map((contact) => ({
            contact,
            score: this.similarityScore(company.name, contact.Name),
          }))
          .filter((s) => s.score >= 0.8)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 1 || (scored.length > 1 && scored[0].score === 1.0)) {
          const best = scored[0];
          const alreadyUsed = mappings.some((m) => m.sageContactId === best.contact.ID);

          if (!alreadyUsed) {
            return [
              ...mappings,
              {
                companyId: company.id,
                companyName: company.name,
                sageContactId: best.contact.ID,
                sageContactName: best.contact.Name,
              },
            ];
          }
        }

        return mappings;
      },
      [],
    );

    await Promise.all(
      newMappings.map((mapping) =>
        this.companyRepo.update(mapping.companyId, {
          sageContactId: mapping.sageContactId,
          sageContactType:
            unmappedCompanies.find((c) => c.id === mapping.companyId)?.companyType ===
            CompanyType.SUPPLIER
              ? "SUPPLIER"
              : "CUSTOMER",
        }),
      ),
    );

    this.logger.log(
      `Contact sync: ${newMappings.length} new mappings, ${unmappedCompanies.length - newMappings.length} unmatched`,
    );

    return {
      matched: newMappings.length,
      unmatched: unmappedCompanies.length - newMappings.length,
      alreadyMapped: alreadyMappedCount,
      newMappings,
    };
  }

  async mappingStatus(appKey: string): Promise<SageContactMappingStatus> {
    const [allCompanies, sageSuppliers, sageCustomers] = await Promise.all([
      this.companyRepo.find({ order: { name: "ASC" } }),
      this.sageConnectionService.sageSuppliers(appKey),
      this.sageConnectionService.sageCustomers(appKey),
    ]);

    const sageSupplierMap = new Map(sageSuppliers.map((s) => [s.ID, s.Name]));
    const sageCustomerMap = new Map(sageCustomers.map((c) => [c.ID, c.Name]));

    const companies: CompanyMappingEntry[] = allCompanies.map((company) => {
      const sageContactName =
        company.sageContactId !== null
          ? ((company.sageContactType === "SUPPLIER"
              ? sageSupplierMap.get(company.sageContactId)
              : sageCustomerMap.get(company.sageContactId)) ?? null)
          : null;

      const suggestedMatches: SuggestedMatch[] =
        company.sageContactId !== null
          ? []
          : this.suggestedMatchesFor(
              company,
              company.companyType === CompanyType.SUPPLIER ? sageSuppliers : sageCustomers,
            );

      return {
        id: company.id,
        name: company.name,
        companyType: company.companyType,
        sageContactId: company.sageContactId,
        sageContactName,
        suggestedMatches,
      };
    });

    const mapped = companies.filter((c) => c.sageContactId !== null).length;

    return {
      companies,
      summary: {
        total: companies.length,
        mapped,
        unmapped: companies.length - mapped,
      },
    };
  }

  async manualMap(
    companyId: number,
    sageContactId: number,
    sageContactType: string,
  ): Promise<RubberCompany> {
    await this.companyRepo.update(companyId, { sageContactId, sageContactType });
    const updated = await this.companyRepo.findOneBy({ id: companyId });
    if (!updated) {
      throw new Error("Company not found");
    }
    return updated;
  }

  async unmap(companyId: number): Promise<RubberCompany> {
    await this.companyRepo.update(companyId, { sageContactId: null, sageContactType: null });
    const updated = await this.companyRepo.findOneBy({ id: companyId });
    if (!updated) {
      throw new Error("Company not found");
    }
    return updated;
  }

  private suggestedMatchesFor(
    company: RubberCompany,
    sageContacts: Array<{ ID: number; Name: string; Active: boolean }>,
  ): SuggestedMatch[] {
    return sageContacts
      .filter((c) => c.Active)
      .map((contact) => ({
        sageId: contact.ID,
        sageName: contact.Name,
        confidence: this.similarityScore(company.name, contact.Name),
      }))
      .filter((m) => m.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private similarityScore(a: string, b: string): number {
    const normA = this.normalizedName(a);
    const normB = this.normalizedName(b);

    if (normA === normB) {
      return 1.0;
    }
    if (normA.includes(normB) || normB.includes(normA)) {
      return 0.8;
    }

    const tokensA = normA.split(/\s+/).filter(Boolean);
    const tokensB = normB.split(/\s+/).filter(Boolean);
    const intersection = tokensA.filter((t) => tokensB.includes(t));
    const union = new Set([...tokensA, ...tokensB]);

    if (union.size === 0) {
      return 0;
    }

    const jaccard = intersection.length / union.size;
    return jaccard >= 0.5 ? jaccard * 0.7 : 0;
  }

  private normalizedName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\(pty\)\s*ltd/gi, "")
      .replace(/\bpty\b/gi, "")
      .replace(/\bltd\b/gi, "")
      .replace(/\bcc\b/gi, "")
      .replace(/\binc\b/gi, "")
      .replace(/\bcorporation\b/gi, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}
