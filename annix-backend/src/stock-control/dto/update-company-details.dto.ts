import {
  OptionalBoolean,
  OptionalEmail,
  OptionalInt,
  OptionalString,
} from "../../lib/dto/validation-decorators";

export class UpdateCompanyDetailsDto {
  @OptionalString({ maxLength: 255 })
  name?: string;

  @OptionalString({ maxLength: 50 })
  registrationNumber?: string;

  @OptionalString({ maxLength: 50 })
  vatNumber?: string;

  @OptionalString({ maxLength: 500 })
  streetAddress?: string;

  @OptionalString({ maxLength: 100 })
  city?: string;

  @OptionalString({ maxLength: 50 })
  province?: string;

  @OptionalString({ maxLength: 10 })
  postalCode?: string;

  @OptionalString({ maxLength: 30 })
  phone?: string;

  @OptionalEmail({ maxLength: 255 })
  email?: string;

  @OptionalString({ maxLength: 500 })
  websiteUrl?: string;

  @OptionalInt({ min: 0, max: 100 })
  pipingLossFactorPct?: number;

  @OptionalInt({ min: 0, max: 100 })
  flatPlateLossFactorPct?: number;

  @OptionalInt({ min: 0, max: 100 })
  structuralSteelLossFactorPct?: number;

  @OptionalBoolean()
  qcEnabled?: boolean;

  @OptionalBoolean()
  messagingEnabled?: boolean;

  @OptionalBoolean()
  staffLeaveEnabled?: boolean;

  @OptionalBoolean()
  workflowEnabled?: boolean;

  @OptionalBoolean()
  notificationsEnabled?: boolean;
}
