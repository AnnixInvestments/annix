import { ConflictException } from "@nestjs/common";

export const ACCOUNT_SELECTION_REQUIRED_CODE = "ACCOUNT_SELECTION_REQUIRED";

/**
 * Raised by login when an email + password matches MORE THAN ONE Annix Orbit
 * module account (password-first disambiguation, ADR-0001 / S3). Non-enumerating:
 * it can only surface AFTER a correct password matched multiple module accounts,
 * so it leaks nothing to an attacker without that password. The client re-submits
 * login with an explicit `accountType` from `availableAccountTypes`.
 */
export class OrbitAccountSelectionRequiredException extends ConflictException {
  constructor(availableAccountTypes: string[]) {
    super({
      code: ACCOUNT_SELECTION_REQUIRED_CODE,
      message: "Multiple Annix Orbit accounts use this email. Choose which to sign in to.",
      availableAccountTypes,
    });
  }
}
