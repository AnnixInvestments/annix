import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "psl2RequiresCvn", async: false })
export class Psl2RequiresCvnConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const pslLevel = obj.pslLevel as string | null | undefined;

    if (pslLevel !== "PSL2") {
      return true;
    }

    const cvnTestTemperatureC = obj.cvnTestTemperatureC as number | null | undefined;
    const cvnAverageJoules = obj.cvnAverageJoules as number | null | undefined;
    const cvnMinimumJoules = obj.cvnMinimumJoules as number | null | undefined;

    const hasCvnData =
      cvnTestTemperatureC !== null &&
      cvnTestTemperatureC !== undefined &&
      cvnAverageJoules !== null &&
      cvnAverageJoules !== undefined &&
      cvnMinimumJoules !== null &&
      cvnMinimumJoules !== undefined;

    return hasCvnData;
  }

  defaultMessage(): string {
    return "PSL2 specification requires CVN (Charpy V-Notch) test data: cvnTestTemperatureC, cvnAverageJoules, and cvnMinimumJoules must all be provided";
  }
}

export function Psl2RequiresCvn(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: Psl2RequiresCvnConstraint,
    });
  };
}

@ValidatorConstraint({ name: "naceRequiresHardnessLimit", async: false })
export class NaceRequiresHardnessLimitConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const naceCompliant = obj.naceCompliant as boolean | null | undefined;

    if (naceCompliant !== true) {
      return true;
    }

    const maxHardnessHrc = obj.maxHardnessHrc as number | null | undefined;

    if (maxHardnessHrc === null || maxHardnessHrc === undefined) {
      return true;
    }

    return maxHardnessHrc <= 22;
  }

  defaultMessage(): string {
    return "NACE MR0175 compliant materials require maximum hardness ≤22 HRC for sour service";
  }
}

export function NaceRequiresHardnessLimit(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NaceRequiresHardnessLimitConstraint,
    });
  };
}
