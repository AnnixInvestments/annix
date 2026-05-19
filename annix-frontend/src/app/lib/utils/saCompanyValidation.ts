/**
 * South African company-identifier format checks for the supplier/customer
 * registration forms. These mirror the backend `IsZACompanyRegNumber` /
 * `IsZAVatNumber` validators (annix-backend/src/shared/validators) so the
 * client rejects malformed input before submit.
 */

/** Strips all whitespace, matching the backend validators. */
const normalize = (value: string): string => value.replace(/\s/g, "");

export const ZA_REGISTRATION_NUMBER_HINT = "Use the format YYYY/NNNNNN/NN, e.g. 2023/123456/07";

export const ZA_VAT_NUMBER_HINT = "A South African VAT number is 10 digits starting with 4";

/** True when `value` is a well-formed SA company registration number. */
export function isValidZaRegistrationNumber(value: string): boolean {
  return /^\d{4}\/\d{6}\/\d{2}$/.test(normalize(value));
}

/** True when `value` is a well-formed SA VAT number. */
export function isValidZaVatNumber(value: string): boolean {
  return /^4\d{9}$/.test(normalize(value));
}
