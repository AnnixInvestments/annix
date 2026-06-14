import {
  OptionalBoolean,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";

export class CreateAnnixOrbitTalentCredentialDto {
  @RequiredString({ maxLength: 50 })
  credentialType: string;

  @OptionalString({ maxLength: 30 })
  issuedAt?: string | null;

  @OptionalString({ maxLength: 30 })
  expiresAt?: string | null;

  @OptionalString({ maxLength: 255 })
  issuingAuthority?: string | null;

  @OptionalString({ maxLength: 500 })
  documentPath?: string | null;

  @OptionalBoolean()
  verified?: boolean;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitTalentCredentialDto {
  @OptionalString({ maxLength: 50 })
  credentialType?: string;

  @OptionalString({ maxLength: 30 })
  issuedAt?: string | null;

  @OptionalString({ maxLength: 30 })
  expiresAt?: string | null;

  @OptionalString({ maxLength: 255 })
  issuingAuthority?: string | null;

  @OptionalString({ maxLength: 500 })
  documentPath?: string | null;

  @OptionalBoolean()
  verified?: boolean;

  @OptionalString()
  notes?: string | null;
}
