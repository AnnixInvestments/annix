import type { PipeItem, GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

export interface ItemIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
  suggestedValue: string | number | null;
  dataTarget: string;
}

export interface ItemDiagnosticResult {
  itemId: string;
  itemType: string;
  description: string;
  issues: ItemIssue[];
}

interface FieldRule {
  field: string;
  label: string;
  dataTarget: string;
  severity: "error" | "warning";
  suggestedValue: string | number | null;
}

const requiredFieldRule = (
  field: string,
  label: string,
  dataTarget: string,
  suggestedValue: string | number | null = null,
): FieldRule => ({
  field,
  label,
  dataTarget,
  severity: "error",
  suggestedValue,
});

const STRAIGHT_PIPE_RULES: FieldRule[] = [
  requiredFieldRule("nominalBoreMm", "Nominal Bore (NB)", "pipe-nb-select", 100),
  requiredFieldRule("individualPipeLength", "Pipe Length", "pipe-length-input", 6000),
  requiredFieldRule("quantityValue", "Quantity", "pipe-quantity-input", 1),
];

const BEND_RULES: FieldRule[] = [
  requiredFieldRule("nominalBoreMm", "Nominal Bore (NB)", "bend-nb-select", 100),
  requiredFieldRule("bendType", "Bend Radius Type", "bend-radius-select", "1.5D"),
  requiredFieldRule("quantityValue", "Quantity", "bend-quantity-input", 1),
];

const FITTING_RULES: FieldRule[] = [
  requiredFieldRule("nominalDiameterMm", "Nominal Diameter", "fitting-nb-select", 100),
  requiredFieldRule("fittingType", "Fitting Type", "fitting-type-select", null),
  requiredFieldRule("quantityValue", "Quantity", "fitting-quantity-input", 1),
];

const PIPE_STEEL_WORK_RULES: FieldRule[] = [
  requiredFieldRule("workType", "Work Type", "steelwork-type-select", null),
  requiredFieldRule("quantity", "Quantity", "steelwork-quantity-input", 1),
];

const EXPANSION_JOINT_RULES: FieldRule[] = [
  requiredFieldRule("nominalDiameterMm", "Nominal Diameter", "expansion-nb-select", 100),
  requiredFieldRule("quantityValue", "Quantity", "expansion-quantity-input", 1),
];

const VALVE_RULES: FieldRule[] = [
  requiredFieldRule("valveType", "Valve Type", "valve-type-select", null),
  requiredFieldRule("quantityValue", "Quantity", "valve-quantity-input", 1),
];

const INSTRUMENT_RULES: FieldRule[] = [
  requiredFieldRule("instrumentType", "Instrument Type", "instrument-type-select", null),
  requiredFieldRule("quantityValue", "Quantity", "instrument-quantity-input", 1),
];

const PUMP_RULES: FieldRule[] = [
  requiredFieldRule("pumpType", "Pump Type", "pump-type-select", null),
  requiredFieldRule("quantityValue", "Quantity", "pump-quantity-input", 1),
];

const RULES_BY_ITEM_TYPE: Record<string, FieldRule[]> = {
  straight_pipe: STRAIGHT_PIPE_RULES,
  bend: BEND_RULES,
  fitting: FITTING_RULES,
  pipe_steel_work: PIPE_STEEL_WORK_RULES,
  expansion_joint: EXPANSION_JOINT_RULES,
  valve: VALVE_RULES,
  instrument: INSTRUMENT_RULES,
  pump: PUMP_RULES,
};

const hasScheduleOrWallThickness = (specs: Record<string, unknown>): boolean =>
  Boolean(specs.scheduleNumber) || Boolean(specs.wallThicknessMm);

const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === null || value === "" || value === 0;

const applyRules = (specs: Record<string, unknown>, rules: FieldRule[]): ItemIssue[] =>
  rules.reduce<ItemIssue[]>((issues, rule) => {
    if (isEmptyValue(specs[rule.field])) {
      return [
        ...issues,
        {
          field: rule.field,
          severity: rule.severity,
          message: `${rule.label} is required`,
          suggestedValue: rule.suggestedValue,
          dataTarget: rule.dataTarget,
        },
      ];
    }
    return issues;
  }, []);

export const diagnoseItem = (item: PipeItem, _globalSpecs?: GlobalSpecs): ItemDiagnosticResult => {
  const specs = (item.specs ?? {}) as Record<string, unknown>;
  const rules = RULES_BY_ITEM_TYPE[item.itemType] ?? [];
  const issues = applyRules(specs, rules);

  if (
    (item.itemType === "straight_pipe" || item.itemType === "bend") &&
    !hasScheduleOrWallThickness(specs)
  ) {
    const target =
      item.itemType === "straight_pipe" ? "pipe-schedule-select" : "bend-schedule-select";
    issues.push({
      field: "scheduleNumber",
      severity: "error",
      message: "Schedule or Wall Thickness is required",
      suggestedValue: "40",
      dataTarget: target,
    });
  }

  return {
    itemId: item.id,
    itemType: item.itemType,
    description: item.description,
    issues,
  };
};

export const diagnoseAllItems = (
  items: PipeItem[],
  globalSpecs?: GlobalSpecs,
): ItemDiagnosticResult[] =>
  items.map((item) => diagnoseItem(item, globalSpecs)).filter((result) => result.issues.length > 0);
