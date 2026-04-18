import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { ComplySaCompanyDetails } from "../../companies/entities/comply-sa-company-details.entity";
import { ComplySaComplianceRequirement } from "../entities/compliance-requirement.entity";

interface CompanyWithDetails {
  company: Company;
  details: ComplySaCompanyDetails | null;
}

interface ConditionCheck {
  key: string;
  evaluate: (ctx: CompanyWithDetails, value: unknown) => boolean;
}

const CONDITION_EVALUATORS: ConditionCheck[] = [
  {
    key: "employee_count_gte",
    evaluate: (ctx, value) => (ctx.details?.employeeCount ?? 0) >= (value as number),
  },
  {
    key: "employee_count_lte",
    evaluate: (ctx, value) => (ctx.details?.employeeCount ?? 0) <= (value as number),
  },
  {
    key: "vat_registered",
    evaluate: (ctx, value) => (ctx.details?.vatRegistered ?? false) === (value as boolean),
  },
  {
    key: "handles_personal_data",
    evaluate: (ctx, value) => (ctx.details?.handlesPersonalData ?? false) === (value as boolean),
  },
  {
    key: "has_payroll",
    evaluate: (ctx, value) => (ctx.details?.hasPayroll ?? false) === (value as boolean),
  },
  {
    key: "annual_turnover_gte",
    evaluate: (ctx, value) =>
      ctx.details?.annualTurnover !== null &&
      ctx.details?.annualTurnover !== undefined &&
      Number(ctx.details.annualTurnover) >= (value as number),
  },
  {
    key: "annual_turnover_lte",
    evaluate: (ctx, value) =>
      ctx.details?.annualTurnover !== null &&
      ctx.details?.annualTurnover !== undefined &&
      Number(ctx.details.annualTurnover) <= (value as number),
  },
  {
    key: "imports_exports",
    evaluate: (ctx, value) => (ctx.details?.importsExports ?? false) === (value as boolean),
  },
  {
    key: "industry_in",
    evaluate: (ctx, value) =>
      ctx.company.industry !== null && (value as string[]).includes(ctx.company.industry),
  },
  {
    key: "entity_type",
    evaluate: (ctx, value) => (ctx.details?.entityType ?? "company") === (value as string),
  },
  {
    key: "entity_type_in",
    evaluate: (ctx, value) => (value as string[]).includes(ctx.details?.entityType ?? "company"),
  },
];

@Injectable()
export class ComplySaRuleEngineService {
  constructor(
    @InjectRepository(ComplySaComplianceRequirement)
    private readonly requirementsRepository: Repository<ComplySaComplianceRequirement>,
  ) {}

  async matchRequirements(
    company: Company,
    details: ComplySaCompanyDetails | null,
  ): Promise<ComplySaComplianceRequirement[]> {
    const allRequirements = await this.requirementsRepository.find();
    const ctx: CompanyWithDetails = { company, details };

    return allRequirements.filter((requirement) => this.conditionsMet(requirement, ctx));
  }

  private conditionsMet(
    requirement: ComplySaComplianceRequirement,
    ctx: CompanyWithDetails,
  ): boolean {
    if (requirement.applicableConditions === null) {
      return true;
    }

    const conditions = requirement.applicableConditions;

    return Object.entries(conditions).every(([key, value]) => {
      const evaluator = CONDITION_EVALUATORS.find((e) => e.key === key);

      if (evaluator == null) {
        return true;
      }

      return evaluator.evaluate(ctx, value);
    });
  }
}
