export const CODING_TYPE_VALUES = [
  "COLOUR",
  "COMPOUND",
  "CURING_METHOD",
  "GRADE",
  "HARDNESS",
  "TYPE",
] as const;

export type CodingType = (typeof CODING_TYPE_VALUES)[number];

export interface CodingTypeConfig {
  value: CodingType;
  label: string;
  description: string;
}

export const CODING_TYPES: CodingTypeConfig[] = [
  { value: "COMPOUND", label: "Compounds", description: "Rubber compound types" },
  { value: "COLOUR", label: "Colours", description: "Product colours" },
  { value: "TYPE", label: "Types", description: "Rubber types" },
  { value: "HARDNESS", label: "Hardness", description: "Hardness values (IRHD)" },
  { value: "GRADE", label: "Grades", description: "Product grades (A, B, C, D)" },
  { value: "CURING_METHOD", label: "Curing Methods", description: "Vulcanization methods" },
];

export const codingTypeLabel = (type: CodingType): string => {
  const config = CODING_TYPES.find((c) => c.value === type);
  return config?.label ?? type;
};

export const codingTypeDescription = (type: CodingType): string => {
  const config = CODING_TYPES.find((c) => c.value === type);
  return config?.description ?? "";
};
