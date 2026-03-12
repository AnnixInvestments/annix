import { Injectable } from "@nestjs/common";
import { now } from "../lib/datetime";

export interface MinimumWageResult {
  compliant: boolean;
  minimumWage: number;
  shortfall: number | null;
  overtimeRate: number;
}

export interface VatAssessmentResult {
  mustRegister: boolean;
  canVoluntaryRegister: boolean;
  threshold: number;
  voluntaryThreshold: number;
}

export interface TurnoverTaxResult {
  eligible: boolean;
  estimatedTax: number;
  effectiveRate: number;
}

export interface CorporateTaxResult {
  tax: number;
  rate: number;
}

export interface SdlResult {
  applicable: boolean;
  amount: number;
  threshold: number;
}

export interface UifResult {
  employeeContribution: number;
  employerContribution: number;
  total: number;
  ceiling: number;
  capped: boolean;
}

export interface TaxCalendarEntry {
  name: string;
  date: string;
  type: string;
  description: string;
}

interface SetaGrantDeadline {
  name: string;
  date: string;
}

export interface SetaGrantInfo {
  mandatoryGrant: { percentage: number; description: string };
  discretionaryGrant: { percentage: string; description: string };
  pivotalGrant: { percentage: string; description: string };
  deadlines: SetaGrantDeadline[];
  steps: string[];
}

@Injectable()
export class ComplySaTaxService {
  minimumWageCheck(hourlyRate: number): MinimumWageResult {
    const minimumWage = 30.23;
    const compliant = hourlyRate >= minimumWage;
    return {
      compliant,
      minimumWage,
      shortfall: compliant ? null : Math.round((minimumWage - hourlyRate) * 100) / 100,
      overtimeRate: Math.round(minimumWage * 1.5 * 100) / 100,
    };
  }

  vatAssessment(annualTurnover: number): VatAssessmentResult {
    const threshold = 2_300_000;
    const voluntaryThreshold = 120_000;
    return {
      mustRegister: annualTurnover > threshold,
      canVoluntaryRegister: annualTurnover >= voluntaryThreshold && annualTurnover <= threshold,
      threshold,
      voluntaryThreshold,
    };
  }

  turnoverTaxEstimate(annualTurnover: number): TurnoverTaxResult {
    const eligible = annualTurnover <= 2_300_000;

    const estimatedTax = (() => {
      if (annualTurnover <= 600_000) {
        return 0;
      } else if (annualTurnover <= 1_000_000) {
        return (annualTurnover - 600_000) * 0.01;
      } else if (annualTurnover <= 1_500_000) {
        return 4_000 + (annualTurnover - 1_000_000) * 0.02;
      } else if (annualTurnover <= 2_300_000) {
        return 14_000 + (annualTurnover - 1_500_000) * 0.03;
      } else {
        return 0;
      }
    })();

    const effectiveRate =
      annualTurnover > 0 ? Math.round((estimatedTax / annualTurnover) * 10000) / 10000 : 0;

    return {
      eligible,
      estimatedTax: Math.round(estimatedTax * 100) / 100,
      effectiveRate,
    };
  }

  corporateTaxEstimate(taxableIncome: number): CorporateTaxResult {
    return {
      tax: Math.round(taxableIncome * 0.27 * 100) / 100,
      rate: 0.27,
    };
  }

  sdlApplicable(annualPayroll: number): SdlResult {
    const threshold = 500_000;
    const applicable = annualPayroll > threshold;
    return {
      applicable,
      amount: applicable ? Math.round(annualPayroll * 0.01 * 100) / 100 : 0,
      threshold,
    };
  }

  uifCalculation(monthlyRemuneration: number): UifResult {
    const ceiling = 17_712;
    const capped = monthlyRemuneration > ceiling;
    const base = capped ? ceiling : monthlyRemuneration;
    const employeeContribution = Math.round(base * 0.01 * 100) / 100;
    const employerContribution = Math.round(base * 0.01 * 100) / 100;
    return {
      employeeContribution,
      employerContribution,
      total: Math.round((employeeContribution + employerContribution) * 100) / 100,
      ceiling,
      capped,
    };
  }

  taxCalendar(financialYearEndMonth: number): TaxCalendarEntry[] {
    const currentYear = now().year;

    const fyeMonth = financialYearEndMonth;
    const fyeYear = fyeMonth >= now().month ? currentYear : currentYear + 1;

    const provisionalFirst = `${fyeYear}-${String(fyeMonth + 6 > 12 ? fyeMonth + 6 - 12 : fyeMonth + 6).padStart(2, "0")}-28`;
    const provisionalSecond = `${fyeMonth <= 6 ? fyeYear : fyeYear + 1}-${String(fyeMonth).padStart(2, "0")}-28`;

    const emp201Dates = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const year = month >= now().month ? currentYear : currentYear + 1;
      return {
        name: `EMP201 Monthly Declaration - ${String(month).padStart(2, "0")}/${year}`,
        date: `${year}-${String(month).padStart(2, "0")}-07`,
        type: "payroll",
        description: "Monthly PAYE, UIF, and SDL declaration and payment due",
      };
    });

    return [
      {
        name: "First Provisional Tax Payment",
        date: provisionalFirst,
        type: "income_tax",
        description: "First provisional tax payment (IRP6) due 6 months after financial year end",
      },
      {
        name: "Second Provisional Tax Payment",
        date: provisionalSecond,
        type: "income_tax",
        description: "Second provisional tax payment (IRP6) due at financial year end",
      },
      {
        name: "Company Income Tax Return (ITR14)",
        date: `${currentYear}-12-15`,
        type: "income_tax",
        description: "Annual company income tax return submission deadline",
      },
      ...emp201Dates,
      {
        name: "EMP501 Interim Reconciliation",
        date: `${currentYear}-10-31`,
        type: "payroll",
        description: "Interim employer reconciliation for March-August period",
      },
      {
        name: "EMP501 Annual Reconciliation",
        date: `${currentYear + 1}-05-31`,
        type: "payroll",
        description: "Annual employer reconciliation for full tax year",
      },
      {
        name: "VAT Return (bi-monthly)",
        date: "Every 25th of even months",
        type: "vat",
        description: "VAT201 return submission and payment due on the 25th of each even month",
      },
      {
        name: "COIDA Return of Earnings",
        date: `${currentYear}-03-31`,
        type: "labour",
        description: "Annual Return of Earnings submission to Compensation Fund",
      },
    ];
  }

  setaGrantInfo(): SetaGrantInfo {
    return {
      mandatoryGrant: {
        percentage: 20,
        description: "Automatically available if WSP/ATR submitted by 30 April",
      },
      discretionaryGrant: {
        percentage: "varies",
        description: "Application-based, depends on SETA priorities",
      },
      pivotalGrant: {
        percentage: "varies",
        description: "For professional/vocational/technical programmes",
      },
      deadlines: [
        { name: "Workplace Skills Plan (WSP)", date: "30 April annually" },
        { name: "Annual Training Report (ATR)", date: "30 April annually" },
      ],
      steps: [
        "Register with relevant SETA",
        "Submit WSP and ATR by 30 April",
        "Claim mandatory grant (20% of SDL paid)",
        "Apply for discretionary grants if eligible",
      ],
    };
  }
}
