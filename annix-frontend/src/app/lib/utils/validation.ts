'use client';

/**
 * Validation utilities for RFQ form
 */

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate Page 1 required fields
 * @param rfqData - RFQ data object
 * @returns Object with validation errors
 */
export function validatePage1RequiredFields(rfqData: any): ValidationErrors {
  const errors: ValidationErrors = {};

  // Project name validation
  if (!rfqData.projectName || rfqData.projectName.trim() === '') {
    errors.projectName = 'Project/RFQ name is required';
  }

  if (!rfqData.projectType || rfqData.projectType.trim() === '') {
    errors.projectType = 'Please select a project type';
  }

  // Customer name validation
  if (!rfqData.customerName || rfqData.customerName.trim() === '') {
    errors.customerName = 'Customer name is required';
  }

  // Description validation
  if (!rfqData.description || rfqData.description.trim() === '') {
    errors.description = 'Project description is required';
  }

  // Customer email validation
  if (!rfqData.customerEmail || rfqData.customerEmail.trim() === '') {
    errors.customerEmail = 'Customer email is required';
  } else if (!isValidEmail(rfqData.customerEmail)) {
    errors.customerEmail = 'Please enter a valid email address';
  }

  // Customer phone validation
  if (!rfqData.customerPhone || rfqData.customerPhone.trim() === '') {
    errors.customerPhone = 'Customer phone is required';
  }

  // Required date validation
  if (!rfqData.requiredDate || rfqData.requiredDate.trim() === '') {
    errors.requiredDate = 'Required date is required';
  }

  return errors;
}

/**
 * Validate Page 2 specifications
 * @param globalSpecs - Global specifications object
 * @returns Object with validation errors
 */
export function validatePage2Specifications(globalSpecs: any): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!globalSpecs.workingPressureBar) {
    errors.workingPressure = 'Working pressure is required';
  }

  if (!globalSpecs.workingTemperatureC) {
    errors.workingTemperature = 'Working temperature is required';
  }

  return errors;
}

/**
 * Validate Page 3 item specifications
 * @param entries - Array of pipe entries
 * @returns Object with validation errors
 */
export function validatePage3Items(entries: any[]): ValidationErrors {
  const errors: ValidationErrors = {};

  entries.forEach((entry, index) => {
    if (!entry.specs.nominalBoreMm) {
      errors[`pipe_${index}_nb`] = 'Nominal bore is required';
    }

    if (!entry.specs.individualPipeLength) {
      errors[`pipe_${index}_length`] = 'Pipe length is required';
    } else if (entry.specs.individualPipeLength <= 0) {
      errors[`pipe_${index}_length`] = 'Pipe length must be greater than 0';
    }

    if (!entry.specs.quantityValue) {
      errors[`pipe_${index}_quantity`] = 'Quantity or total length is required';
    } else if (entry.specs.quantityValue <= 0) {
      errors[`pipe_${index}_quantity`] = 'Quantity must be greater than 0';
    }

    if (!entry.specs.scheduleNumber && !entry.specs.wallThicknessMm) {
      errors[`pipe_${index}_schedule`] = 'Schedule or wall thickness is required';
    }
  });

  return errors;
}

/**
 * Email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Phone number validation (South African format)
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // South African phone formats:
  // +27xxxxxxxxx (11-12 digits including country code)
  // 0xxxxxxxxxx (10-11 digits)
  // Cell: 07x, 08x, 06x
  // Landline: 01x, 02x, 03x, 04x, 05x
  
  if (digitsOnly.startsWith('27') && digitsOnly.length >= 11 && digitsOnly.length <= 12) {
    return true; // International format
  }
  
  if (digitsOnly.startsWith('0') && digitsOnly.length >= 10 && digitsOnly.length <= 11) {
    return true; // Local format
  }
  
  return false;
}

/**
 * Date validation
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if all required fields are valid for progression
 * @param step - Current step number
 * @param formData - Form data object
 * @param entries - RFQ entries array (for step 3)
 * @returns boolean indicating if can proceed
 */
export function canProceedToNextStep(step: number, formData: any, entries?: any[]): boolean {
  switch (step) {
    case 1:
      const page1Errors = validatePage1RequiredFields(formData);
      return Object.keys(page1Errors).length === 0;

    case 2:
      const page2Errors = validatePage2Specifications(formData.globalSpecs || {});
      return Object.keys(page2Errors).length === 0;

    case 3:
      if (!entries) return false;
      const page3Errors = validatePage3Items(entries);
      return Object.keys(page3Errors).length === 0 && entries.length > 0;

    default:
      return true;
  }
}
