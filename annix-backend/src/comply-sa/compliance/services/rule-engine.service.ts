import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";
import { ComplySaComplianceRequirement } from "../entities/compliance-requirement.entity";

interface ConditionCheck {
  key: string;
  evaluate: (company: ComplySaCompany, value: unknown) => boolean;
}

const CONDITION_EVALUATORS: ConditionCheck[] = [
  {
    key: "employee_count_gte",
    evaluate: (company, value) => company.employeeCount >= (value as number),
  },
  {
    key: "employee_count_lte",
    evaluate: (company, value) => company.employeeCount <= (value as number),
  },
  {
    key: "vat_registered",
    evaluate: (company, value) => company.vatRegistered === (value as boolean),
  },
  {
    key: "handles_personal_data",
    evaluate: (company, value) => company.handlesPersonalData === (value as boolean),
  },
  {
    key: "has_payroll",
    evaluate: (company, value) => company.hasPayroll === (value as boolean),
  },
  {
    key: "annual_turnover_gte",
    evaluate: (company, value) =>
      company.annualTurnover !== null && parseFloat(company.annualTurnover) >= (value as number),
  },
  {
    key: "annual_turnover_lte",
    evaluate: (company, value) =>
      company.annualTurnover !== null && parseFloat(company.annualTurnover) <= (value as number),
  },
  {
    key: "imports_exports",
    evaluate: (company, value) => company.importsExports === (value as boolean),
  },
  {
    key: "industry_in",
    evaluate: (company, value) =>
      company.industry !== null && (value as string[]).includes(company.industry),
  },
  {
    key: "entity_type",
    evaluate: (company, value) => company.entityType === (value as string),
  },
  {
    key: "entity_type_in",
    evaluate: (company, value) => (value as string[]).includes(company.entityType),
  },
];

@Injectable()
export class ComplySaRuleEngineService {
  constructor(
    @InjectRepository(ComplySaComplianceRequirement)
    private readonly requirementsRepository: Repository<ComplySaComplianceRequirement>,
  ) {}

  async matchRequirements(company: ComplySaCompany): Promise<ComplySaComplianceRequirement[]> {
    const allRequirements = await this.requirementsRepository.find();

    return allRequirements.filter((requirement) => this.conditionsMet(requirement, company));
  }

  private conditionsMet(
    requirement: ComplySaComplianceRequirement,
    company: ComplySaCompany,
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

      return evaluator.evaluate(company, value);
    });
  }
}
