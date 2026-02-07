import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

const ZA_PHONE_REGEX = /^(\+27|0)[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{4}$/;

@ValidatorConstraint({ async: false })
export class IsZAPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (value.trim() === "") return true;

    const normalized = value.replace(/[\s.-]/g, "");

    if (normalized.startsWith("+27") && normalized.length === 12) {
      return /^\+27\d{9}$/.test(normalized);
    }

    if (normalized.startsWith("0") && normalized.length === 10) {
      return /^0\d{9}$/.test(normalized);
    }

    return ZA_PHONE_REGEX.test(value);
  }

  defaultMessage(): string {
    return "Phone number must be a valid South African number (e.g., +27 11 555 0123 or 011 555 0123)";
  }
}

export function IsZAPhone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsZAPhoneConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsInternationalPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (value.trim() === "") return true;

    const normalized = value.replace(/[\s.-]/g, "");
    return /^\+\d{10,15}$/.test(normalized) || /^0\d{9,14}$/.test(normalized);
  }

  defaultMessage(): string {
    return "Phone number must be in a valid format (e.g., +27 11 555 0123)";
  }
}

export function IsPhone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsInternationalPhoneConstraint,
    });
  };
}
