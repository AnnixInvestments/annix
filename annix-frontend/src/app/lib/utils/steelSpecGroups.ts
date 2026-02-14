import type { SelectOptionGroup } from "@/app/components/ui/Select";

interface SteelSpec {
  id: number;
  steelSpecName: string;
}

const STEEL_SPEC_GROUPS: Array<{ label: string; patterns: string[] }> = [
  {
    label: "South African Standards",
    patterns: ["SABS 62", "SABS 719", "SANS 62", "SANS 719"],
  },
  {
    label: "Carbon Steel (ASTM A106/A53)",
    patterns: ["ASTM A106", "ASTM A53"],
  },
  {
    label: "Line Pipe (API 5L)",
    patterns: ["API 5L"],
  },
  {
    label: "Low Temperature Steel (ASTM A333)",
    patterns: ["ASTM A333"],
  },
  {
    label: "Heat Exchanger/Boiler Tubes",
    patterns: ["ASTM A179", "ASTM A192"],
  },
  {
    label: "Structural Tubing (ASTM A500)",
    patterns: ["ASTM A500"],
  },
  {
    label: "Alloy Steel (ASTM A335)",
    patterns: ["ASTM A335"],
  },
  {
    label: "Stainless Steel - Seamless (A312)",
    patterns: ["ASTM A312"],
  },
  {
    label: "Stainless Steel - Welded (A358)",
    patterns: ["ASTM A358"],
  },
  {
    label: "Duplex Stainless Steel",
    patterns: ["ASTM A790"],
  },
  {
    label: "European Standards (EN)",
    patterns: ["EN 10217", "EN 10216", "EN 10255"],
  },
];

export const groupSteelSpecifications = (specs: SteelSpec[]): SelectOptionGroup[] => {
  const groups: SelectOptionGroup[] = [];
  const usedIds = new Set<number>();

  STEEL_SPEC_GROUPS.forEach((groupDef) => {
    const matchingSpecs = specs.filter(
      (spec) =>
        groupDef.patterns.some((pattern) => spec.steelSpecName.includes(pattern)) &&
        !usedIds.has(spec.id),
    );

    if (matchingSpecs.length > 0) {
      matchingSpecs.forEach((spec) => usedIds.add(spec.id));
      groups.push({
        label: groupDef.label,
        options: matchingSpecs.map((spec) => ({
          value: String(spec.id),
          label: spec.steelSpecName,
        })),
      });
    }
  });

  const uncategorized = specs.filter((spec) => !usedIds.has(spec.id));
  if (uncategorized.length > 0) {
    groups.push({
      label: "Other",
      options: uncategorized.map((spec) => ({
        value: String(spec.id),
        label: spec.steelSpecName,
      })),
    });
  }

  return groups;
};
