export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*(),.?":{}|<>',
} as const;

export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
    const specialCharRegex = new RegExp(
      `[${PASSWORD_REQUIREMENTS.specialChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`,
    );
    if (!specialCharRegex.test(password)) {
      errors.push("Password must contain at least one special character");
    }
  }

  return errors;
}

export function validatePasswordWithResult(password: string): PasswordValidationResult {
  const errors = validatePassword(password);
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}
