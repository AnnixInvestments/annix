export type EmploymentTypeValue =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "internship"
  | "learnership";

export interface EmploymentTypeOption {
  value: EmploymentTypeValue;
  label: string;
}

export const EMPLOYMENT_TYPE_OPTIONS: readonly EmploymentTypeOption[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
  { value: "learnership", label: "Learnership" },
] as const;
