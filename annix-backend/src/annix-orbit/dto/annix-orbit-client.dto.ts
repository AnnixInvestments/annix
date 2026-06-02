import {
  OptionalIn,
  OptionalNumber,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { ORBIT_CLIENT_STATUSES } from "../entities/annix-orbit-client.entity";

export class CreateAnnixOrbitClientDto {
  @RequiredString({ maxLength: 255 })
  name: string;

  @OptionalString({ maxLength: 100 })
  industry?: string | null;

  @OptionalString({ maxLength: 100 })
  province?: string | null;

  @OptionalString({ maxLength: 100 })
  city?: string | null;

  @OptionalString({ maxLength: 255 })
  contactName?: string | null;

  @OptionalString({ maxLength: 255 })
  contactEmail?: string | null;

  @OptionalString({ maxLength: 50 })
  contactPhone?: string | null;

  @OptionalNumber()
  feePercentage?: number | null;

  @OptionalString({ maxLength: 100 })
  paymentTerms?: string | null;

  @OptionalIn(ORBIT_CLIENT_STATUSES)
  status?: string;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitClientDto extends CreateAnnixOrbitClientDto {}
