"use client";

import { fromISO } from "@/app/lib/datetime";
import {
  validatePipeEntries,
  validateProjectDetails,
  validateSpecifications,
} from "@/app/lib/validation/rfqSchemas";

export interface ValidationErrors {
  [key: string]: string;
}

export function validatePage1RequiredFields(rfqData: unknown): ValidationErrors {
  const result = validateProjectDetails(rfqData);
  return result.errors;
}

export function validatePage2Specifications(
  globalSpecs: unknown,
  masterData?: { flangeStandards?: Array<{ id: number; code: string }> },
): ValidationErrors {
  const result = validateSpecifications(globalSpecs, masterData);
  return result.errors;
}

export function validatePage3Items(entries: unknown[]): ValidationErrors {
  const result = validatePipeEntries(entries);
  return result.errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.startsWith("27") && digitsOnly.length >= 11 && digitsOnly.length <= 12) {
    return true;
  }
  if (digitsOnly.startsWith("0") && digitsOnly.length >= 10 && digitsOnly.length <= 11) {
    return true;
  }
  return false;
}

function isValidDate(dateString: string): boolean {
  const date = fromISO(dateString);
  return date.isValid;
}

export function canProceedToNextStep(
  step: number,
  formData: { globalSpecs?: unknown },
  entries?: unknown[],
): boolean {
  switch (step) {
    case 1: {
      const page1Errors = validatePage1RequiredFields(formData);
      return Object.keys(page1Errors).length === 0;
    }

    case 2: {
      const page2Errors = validatePage2Specifications(formData.globalSpecs || {});
      return Object.keys(page2Errors).length === 0;
    }

    case 3: {
      if (!entries) return false;
      const page3Errors = validatePage3Items(entries);
      return Object.keys(page3Errors).length === 0 && entries.length > 0;
    }

    default:
      return true;
  }
}

export {
  validatePipeEntries,
  validateProjectDetails,
  validateSpecifications,
} from "@/app/lib/validation/rfqSchemas";
