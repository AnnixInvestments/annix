import {
  OptionalIn,
  OptionalString,
  RequiredInt,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { ORBIT_COMPLIANCE_STATUSES } from "../entities/annix-orbit-compliance-item.entity";

export class CreateAnnixOrbitComplianceItemDto {
  @RequiredInt()
  candidateId: number;

  @RequiredString({ maxLength: 100 })
  documentType: string;

  @OptionalIn(ORBIT_COMPLIANCE_STATUSES)
  status?: string;

  @OptionalString({ maxLength: 20 })
  expiryDate?: string | null;

  @OptionalString()
  notes?: string | null;
}

export class UpdateAnnixOrbitComplianceItemDto {
  @RequiredString({ maxLength: 100 })
  documentType: string;

  @OptionalIn(ORBIT_COMPLIANCE_STATUSES)
  status?: string;

  @OptionalString({ maxLength: 20 })
  expiryDate?: string | null;

  @OptionalString()
  notes?: string | null;
}
