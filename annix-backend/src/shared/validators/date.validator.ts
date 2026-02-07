import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { DateTime } from "luxon";

@ValidatorConstraint({ async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === "") return true;

    const date =
      typeof value === "string"
        ? DateTime.fromISO(value)
        : value instanceof Date
          ? DateTime.fromJSDate(value)
          : null;

    if (!date || !date.isValid) return false;

    return date > DateTime.now().startOf("day");
  }

  defaultMessage(): string {
    return "Date must be in the future";
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsFutureOrTodayDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === "") return true;

    const date =
      typeof value === "string"
        ? DateTime.fromISO(value)
        : value instanceof Date
          ? DateTime.fromJSDate(value)
          : null;

    if (!date || !date.isValid) return false;

    return date >= DateTime.now().startOf("day");
  }

  defaultMessage(): string {
    return "Date must be today or in the future";
  }
}

export function IsFutureOrTodayDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureOrTodayDateConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === "") return true;

    const date =
      typeof value === "string"
        ? DateTime.fromISO(value)
        : value instanceof Date
          ? DateTime.fromJSDate(value)
          : null;

    if (!date || !date.isValid) return false;

    return date < DateTime.now().startOf("day");
  }

  defaultMessage(): string {
    return "Date must be in the past";
  }
}

export function IsPastDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPastDateConstraint,
    });
  };
}
