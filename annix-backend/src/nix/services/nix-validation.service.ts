import { Injectable, Logger } from "@nestjs/common";

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  suggestion?: string;
  itemIndex?: number;
}

export interface RfqItem {
  itemType: string;
  diameter?: number;
  secondaryDiameter?: number;
  schedule?: string;
  material?: string;
  materialGrade?: string;
  flangeConfig?: string;
  flangeRating?: string;
  angle?: number;
  wallThickness?: number;
  length?: number;
  quantity?: number;
}

@Injectable()
export class NixValidationService {
  private readonly logger = new Logger(NixValidationService.name);

  validateItem(
    item: RfqItem,
    context?: { allItems?: RfqItem[]; itemIndex?: number },
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    issues.push(...this.validateImpossibleCombinations(item, context?.itemIndex));
    issues.push(...this.validateUnusualPatterns(item, context?.itemIndex));

    if (context?.allItems && context.itemIndex !== undefined) {
      issues.push(...this.validateCrossReferences(item, context.allItems, context.itemIndex));
    }

    return issues;
  }

  validateRfq(items: RfqItem[]): ValidationIssue[] {
    const allIssues: ValidationIssue[] = [];

    items.forEach((item, index) => {
      const itemIssues = this.validateItem(item, { allItems: items, itemIndex: index });
      allIssues.push(...itemIssues);
    });

    allIssues.push(...this.validateConsistency(items));

    return allIssues;
  }

  private validateImpossibleCombinations(item: RfqItem, itemIndex?: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (item.schedule === "Sch 10" && item.diameter && item.diameter >= 600) {
      issues.push({
        severity: "error",
        field: "schedule",
        message: `${item.diameter}NB pipe at Schedule 10 is structurally unsound for this diameter`,
        suggestion: "Use Schedule 40 or Schedule 80 for pipes 600NB and larger",
        itemIndex,
      });
    }

    if (
      item.material?.toLowerCase().includes("stainless") &&
      item.flangeConfig &&
      item.flangeConfig !== "none"
    ) {
      issues.push({
        severity: "warning",
        field: "material",
        message: "Ensure flange material matches pipe material to avoid galvanic corrosion",
        suggestion: "Stainless steel pipes should have stainless steel flanges",
        itemIndex,
      });
    }

    if (item.itemType === "reducer" && item.diameter && item.secondaryDiameter) {
      const ratio = item.diameter / item.secondaryDiameter;
      if (ratio > 2 || ratio < 0.5) {
        issues.push({
          severity: "warning",
          field: "secondaryDiameter",
          message: `Large reduction from ${item.diameter}NB to ${item.secondaryDiameter}NB (${ratio.toFixed(1)}:1 ratio)`,
          suggestion: "Consider using multiple reducers for gradual reduction",
          itemIndex,
        });
      }
    }

    if (item.itemType === "bend" && item.angle) {
      const standardAngles = [15, 30, 45, 60, 90];
      if (!standardAngles.includes(item.angle)) {
        issues.push({
          severity: "info",
          field: "angle",
          message: `Non-standard bend angle: ${item.angle}°`,
          suggestion: `Standard angles are ${standardAngles.join("°, ")}°`,
          itemIndex,
        });
      }
    }

    return issues;
  }

  private validateUnusualPatterns(item: RfqItem, itemIndex?: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (item.flangeConfig && item.flangeConfig !== "none" && !item.flangeRating) {
      issues.push({
        severity: "warning",
        field: "flangeRating",
        message: "Flanged ends specified but no flange rating provided",
        suggestion: "Common ratings: PN16, PN25, Class 150, Class 300",
        itemIndex,
      });
    }

    if (item.schedule && item.wallThickness) {
      const expectedThickness = this.scheduleToWallThickness(item.schedule, item.diameter);
      if (expectedThickness && Math.abs(expectedThickness - item.wallThickness) > 0.5) {
        issues.push({
          severity: "warning",
          field: "wallThickness",
          message: `Wall thickness ${item.wallThickness}mm doesn't match ${item.schedule} (expected ~${expectedThickness}mm)`,
          suggestion: `Verify wall thickness for ${item.schedule} at ${item.diameter}NB`,
          itemIndex,
        });
      }
    }

    if (item.itemType === "pipe" && item.length && item.length > 12) {
      issues.push({
        severity: "info",
        field: "length",
        message: `Pipe length ${item.length}m exceeds standard 12m stock length`,
        suggestion: "May require multiple joints or special order",
        itemIndex,
      });
    }

    return issues;
  }

  private validateCrossReferences(
    item: RfqItem,
    allItems: RfqItem[],
    itemIndex: number,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (item.itemType === "reducer" && itemIndex + 1 < allItems.length) {
      const nextItem = allItems[itemIndex + 1];
      if (
        nextItem.diameter &&
        item.secondaryDiameter &&
        nextItem.diameter !== item.secondaryDiameter
      ) {
        issues.push({
          severity: "warning",
          field: "secondaryDiameter",
          message: `Reducer goes to ${item.secondaryDiameter}NB but next item is ${nextItem.diameter}NB`,
          suggestion: `Should the reducer go to ${nextItem.diameter}NB instead?`,
          itemIndex,
        });
      }
    }

    if (itemIndex > 0) {
      const prevItem = allItems[itemIndex - 1];
      if (
        prevItem.itemType === "reducer" &&
        item.diameter &&
        prevItem.secondaryDiameter !== item.diameter
      ) {
        issues.push({
          severity: "warning",
          field: "diameter",
          message: `Previous reducer goes to ${prevItem.secondaryDiameter}NB but this item is ${item.diameter}NB`,
          suggestion: `Should this item be ${prevItem.secondaryDiameter}NB?`,
          itemIndex,
        });
      }
    }

    return issues;
  }

  private validateConsistency(items: RfqItem[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const materialGrades = items.map((item) => item.materialGrade).filter(Boolean);
    const uniqueGrades = [...new Set(materialGrades)];

    if (uniqueGrades.length > 1 && items.length > 3) {
      const mostCommon = this.mostCommonValue(materialGrades);
      const outliers = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.materialGrade && item.materialGrade !== mostCommon);

      outliers.forEach(({ index }) => {
        issues.push({
          severity: "info",
          field: "materialGrade",
          message: `Item has different material grade than majority of items (${mostCommon})`,
          suggestion: `Most items use ${mostCommon} - is this intentional?`,
          itemIndex: index,
        });
      });
    }

    const schedules = items.map((item) => item.schedule).filter(Boolean);
    const uniqueSchedules = [...new Set(schedules)];

    if (uniqueSchedules.length > 2 && items.length > 5) {
      issues.push({
        severity: "info",
        field: "schedule",
        message: `Multiple different schedules used: ${uniqueSchedules.join(", ")}`,
        suggestion: "Verify that mixed schedules are intentional",
      });
    }

    return issues;
  }

  private scheduleToWallThickness(schedule: string, diameter?: number): number | null {
    if (!diameter) return null;

    const scheduleMap: Record<string, Record<number, number>> = {
      "Sch 10": {
        50: 2.4,
        80: 2.8,
        100: 3.2,
        150: 3.4,
        200: 3.8,
        250: 4.2,
        300: 4.6,
      },
      "Sch 40": {
        50: 3.7,
        80: 4.5,
        100: 5.5,
        150: 7.1,
        200: 8.2,
        250: 9.3,
        300: 10.3,
      },
      "Sch 80": {
        50: 5.1,
        80: 6.0,
        100: 8.1,
        150: 10.9,
        200: 12.7,
        250: 15.1,
        300: 17.5,
      },
    };

    return scheduleMap[schedule]?.[diameter] || null;
  }

  private mostCommonValue<T>(values: T[]): T | undefined {
    if (values.length === 0) return undefined;

    const counts = values.reduce(
      (acc, val) => {
        acc[String(val)] = (acc[String(val)] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const maxCount = Math.max(...Object.values(counts));
    const mostCommon = Object.keys(counts).find((key) => counts[key] === maxCount);

    return values.find((v) => String(v) === mostCommon);
  }
}
