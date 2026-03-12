import { Injectable } from "@nestjs/common";
import { ComplySaCompany } from "../../companies/entities/company.entity";
import { DateTime, fromISO, now } from "../../lib/datetime";
import { ComplySaComplianceRequirement } from "../entities/compliance-requirement.entity";

interface AnniversaryOffsetRule {
  type: "anniversary_offset";
  field: string;
  offset_days: number;
}

interface FixedMonthlyRule {
  type: "fixed_monthly";
  day: number;
}

interface FixedDatesRule {
  type: "fixed_dates";
  dates: Array<{ month: number; day: number }>;
}

interface BiMonthlyRule {
  type: "bi_monthly";
  day: number;
}

interface OngoingRule {
  type: "ongoing";
}

type DeadlineRule =
  | AnniversaryOffsetRule
  | FixedMonthlyRule
  | FixedDatesRule
  | BiMonthlyRule
  | OngoingRule;

@Injectable()
export class ComplySaDeadlineService {
  calculateNextDueDate(
    requirement: ComplySaComplianceRequirement,
    company: ComplySaCompany,
  ): string | null {
    if (requirement.deadlineRule === null) {
      return null;
    }

    const rule = requirement.deadlineRule as unknown as DeadlineRule;
    const today = now();

    if (rule.type === "ongoing") {
      return null;
    } else if (rule.type === "anniversary_offset") {
      return this.anniversaryOffset(rule, company, today);
    } else if (rule.type === "fixed_monthly") {
      return this.fixedMonthly(rule, today);
    } else if (rule.type === "fixed_dates") {
      return this.fixedDates(rule, today);
    } else if (rule.type === "bi_monthly") {
      return this.biMonthly(rule, today);
    } else {
      return null;
    }
  }

  private anniversaryOffset(
    rule: AnniversaryOffsetRule,
    company: ComplySaCompany,
    today: DateTime,
  ): string | null {
    const fieldValue = (company as unknown as Record<string, unknown>)[rule.field] as string | null;

    if (fieldValue === null || fieldValue === undefined) {
      return null;
    }

    const baseDate = fromISO(fieldValue);

    if (!baseDate.isValid) {
      return null;
    }

    const thisYearAnniversary = baseDate.set({ year: today.year }).plus({ days: rule.offset_days });

    if (thisYearAnniversary > today) {
      return thisYearAnniversary.toISO()!;
    } else {
      return baseDate
        .set({ year: today.year + 1 })
        .plus({ days: rule.offset_days })
        .toISO()!;
    }
  }

  private fixedMonthly(rule: FixedMonthlyRule, today: DateTime): string {
    const thisMonth = today.set({ day: rule.day });

    if (thisMonth > today) {
      return thisMonth.toISO()!;
    } else {
      return thisMonth.plus({ months: 1 }).toISO()!;
    }
  }

  private fixedDates(rule: FixedDatesRule, today: DateTime): string {
    const futureDates = rule.dates
      .map((d) => {
        const thisYear = today.set({ month: d.month, day: d.day });
        const nextYear = thisYear.plus({ years: 1 });
        return thisYear > today ? thisYear : nextYear;
      })
      .sort((a, b) => a.toMillis() - b.toMillis());

    return futureDates[0].toISO()!;
  }

  private biMonthly(rule: BiMonthlyRule, today: DateTime): string {
    const currentDay = today.set({ day: rule.day });

    if (currentDay > today && today.month % 2 !== 0) {
      return currentDay.toISO()!;
    } else {
      const nextBiMonth =
        today.month % 2 === 0
          ? today.set({ day: rule.day }).plus({ months: 1 })
          : today.set({ day: rule.day }).plus({ months: 2 });
      return nextBiMonth.toISO()!;
    }
  }
}
