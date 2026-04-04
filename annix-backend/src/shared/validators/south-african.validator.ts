import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ async: false })
export class IsZAIdNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (value.trim() === "") return true;

    const normalized = value.replace(/\s/g, "");
    if (!/^\d{13}$/.test(normalized)) return false;

    const digits = normalized.split("").map(Number);
    const checkDigit = digits[12];

    const oddSum = digits.filter((_, i) => i % 2 === 0 && i < 12).reduce((sum, d) => sum + d, 0);

    const evenDigits = digits
      .filter((_, i) => i % 2 === 1 && i < 12)
      .map((d) => d.toString())
      .join("");
    const evenDoubled = (Number(evenDigits) * 2).toString();
    const evenSum = evenDoubled.split("").reduce((sum, c) => sum + Number(c), 0);

    const total = oddSum + evenSum;
    const computedCheck = (10 - (total % 10)) % 10;

    return computedCheck === checkDigit;
  }

  defaultMessage(): string {
    return "Must be a valid 13-digit South African ID number";
  }
}

export function IsZAIdNumber(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsZAIdNumberConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsZAVatNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (value.trim() === "") return true;

    const normalized = value.replace(/\s/g, "");
    return /^4\d{9}$/.test(normalized);
  }

  defaultMessage(): string {
    return "Must be a valid 10-digit South African VAT number starting with 4";
  }
}

export function IsZAVatNumber(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsZAVatNumberConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsZACompanyRegNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    if (value.trim() === "") return true;

    const normalized = value.replace(/\s/g, "");
    return /^\d{4}\/\d{6}\/\d{2}$/.test(normalized);
  }

  defaultMessage(): string {
    return "Must be a valid South African company registration number (YYYY/NNNNNN/NN)";
  }
}

export function IsZACompanyRegNumber(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsZACompanyRegNumberConstraint,
    });
  };
}
