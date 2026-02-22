"use client";

import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

const phoneSchema = z
  .string()
  .min(1, "Customer phone is required")
  .refine(
    (phone) => {
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.startsWith("27") && digitsOnly.length >= 11 && digitsOnly.length <= 12) {
        return true;
      }
      if (digitsOnly.startsWith("0") && digitsOnly.length >= 10 && digitsOnly.length <= 11) {
        return true;
      }
      return false;
    },
    { message: "Please enter a valid phone number" },
  );

export const projectDetailsSchema = z.object({
  projectName: z.string().min(1, "Project/RFQ name is required").trim(),
  projectType: z.string().min(1, "Please select a project type").trim(),
  customerName: z.string().min(1, "Customer name is required").trim(),
  description: z.string().min(1, "Project description is required").trim(),
  customerEmail: emailSchema.min(1, "Customer email is required"),
  customerPhone: phoneSchema,
  requiredDate: z.string().min(1, "Required date is required"),
  requiredProducts: z.array(z.string()).min(1, "Please select at least one product or service"),
});

export type ProjectDetailsFormData = z.infer<typeof projectDetailsSchema>;

export const specificationsSchema = z.object({
  workingPressureBar: z.number({ required_error: "Working pressure is required" }).positive(),
  workingTemperatureC: z.number({ required_error: "Working temperature is required" }),
  flangeStandardId: z.number().optional().nullable(),
  flangeTypeCode: z.string().optional().nullable(),
});

export type SpecificationsFormData = z.infer<typeof specificationsSchema>;

export const pipeEntrySchema = z.object({
  specs: z.object({
    nominalBoreMm: z.number({ required_error: "Nominal bore is required" }).positive(),
    individualPipeLength: z
      .number({ required_error: "Pipe length is required" })
      .positive("Pipe length must be greater than 0"),
    quantityValue: z
      .number({ required_error: "Quantity or total length is required" })
      .positive("Quantity must be greater than 0"),
    scheduleNumber: z.string().optional().nullable(),
    wallThicknessMm: z.number().positive().optional().nullable(),
  }),
});

export type PipeEntryFormData = z.infer<typeof pipeEntrySchema>;

export const pipeEntriesSchema = z
  .array(pipeEntrySchema)
  .min(1, "At least one pipe entry is required")
  .superRefine((entries, ctx) => {
    entries.forEach((entry, index) => {
      if (!entry.specs.scheduleNumber && !entry.specs.wallThicknessMm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Schedule or wall thickness is required",
          path: [index, "specs", "scheduleNumber"],
        });
      }
    });
  });

export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
  data?: unknown;
}

export function validateProjectDetails(data: unknown): ValidationResult {
  const result = projectDetailsSchema.safeParse(data);
  if (result.success) {
    return { success: true, errors: {}, data: result.data };
  }
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });
  return { success: false, errors };
}

export function validateSpecifications(
  globalSpecs: unknown,
  masterData?: { flangeStandards?: Array<{ id: number; code: string }> },
): ValidationResult {
  const result = specificationsSchema.safeParse(globalSpecs);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors[path === "workingPressureBar" ? "workingPressure" : path] = issue.message;
    });
    return { success: false, errors };
  }

  const data = result.data;
  const errors: Record<string, string> = {};

  if (masterData?.flangeStandards && data.flangeStandardId) {
    const selectedStandard = masterData.flangeStandards.find((s) => s.id === data.flangeStandardId);
    const requiresFlangeType =
      selectedStandard?.code === "SABS 1123" || selectedStandard?.code === "BS 4504";
    if (requiresFlangeType && !data.flangeTypeCode) {
      errors.flangeTypeCode = "Flange type is required for SABS 1123 and BS 4504 standards";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, errors: {}, data };
}

export function validatePipeEntries(entries: unknown): ValidationResult {
  const result = pipeEntriesSchema.safeParse(entries);
  if (result.success) {
    return { success: true, errors: {}, data: result.data };
  }
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path;
    if (path.length >= 2 && typeof path[0] === "number") {
      const index = path[0];
      const field = path.slice(1).join("_");
      errors[`pipe_${index}_${field}`] = issue.message;
    } else {
      errors[path.join(".")] = issue.message;
    }
  });
  return { success: false, errors };
}
