import {
  OptionalString,
  RequiredEmail,
  RequiredPhone,
  RequiredString,
} from "../../lib/dto/validation-decorators";

export class CompleteOnboardingDto {
  @RequiredString({ maxLength: 255 })
  legalName: string;

  @OptionalString({ maxLength: 255 })
  tradingName?: string;

  @RequiredString({ maxLength: 50 })
  registrationNumber: string;

  @OptionalString({ maxLength: 50 })
  vatNumber?: string;

  @RequiredString({ maxLength: 500 })
  streetAddress: string;

  @RequiredString({ maxLength: 100 })
  city: string;

  @OptionalString({ maxLength: 50 })
  province?: string;

  @RequiredString({ maxLength: 10 })
  postalCode: string;

  @RequiredPhone({ maxLength: 30, za: false })
  phone: string;

  @RequiredEmail({ maxLength: 255 })
  email: string;
}
