import {
  OptionalIn,
  OptionalInt,
  OptionalNumber,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import {
  ORBIT_PLACEMENT_INVOICE_STATUSES,
  ORBIT_PLACEMENT_STATUSES,
} from "../entities/annix-orbit-placement.entity";

export class CreateAnnixOrbitPlacementDto {
  @OptionalInt()
  clientId?: number | null;

  @RequiredString({ maxLength: 255 })
  candidateName: string;

  @RequiredString({ maxLength: 255 })
  jobTitle: string;

  @OptionalNumber()
  salary?: number | null;

  @OptionalNumber()
  placementFee?: number | null;

  @OptionalString({ maxLength: 20 })
  startDate?: string | null;

  @OptionalString({ maxLength: 20 })
  guaranteeUntil?: string | null;

  @OptionalIn(ORBIT_PLACEMENT_STATUSES)
  status?: string;

  @OptionalIn(ORBIT_PLACEMENT_INVOICE_STATUSES)
  invoiceStatus?: string;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitPlacementDto extends CreateAnnixOrbitPlacementDto {}
