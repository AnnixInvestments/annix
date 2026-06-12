import { OptionalString, RequiredString } from "../../lib/dto/validation-decorators";

export class DraftAnnixOrbitMessageDto {
  @RequiredString({ maxLength: 40 })
  templateKey: string;

  @OptionalString({ maxLength: 255 })
  candidateName?: string | null;

  @OptionalString({ maxLength: 255 })
  role?: string | null;

  @OptionalString({ maxLength: 2000 })
  notes?: string | null;
}

export class SendAnnixOrbitMessageDto {
  @RequiredString({ maxLength: 255 })
  to: string;

  @RequiredString({ maxLength: 255 })
  subject: string;

  @RequiredString({ maxLength: 20000 })
  body: string;
}
