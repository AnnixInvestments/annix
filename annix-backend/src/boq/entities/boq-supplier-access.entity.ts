import { ApiProperty } from "@nestjs/swagger";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { Boq } from "./boq.entity";

export enum SupplierBoqStatus {
  PENDING = "pending", // Awaiting supplier response
  VIEWED = "viewed", // Supplier has viewed the BOQ
  QUOTED = "quoted", // Supplier has submitted quote
  DECLINED = "declined", // Supplier declined to quote
  EXPIRED = "expired", // Quote deadline passed
}

/**
 * Tracks which suppliers have access to which BOQs and which sections they can see.
 * This is the core table for BOQ distribution to suppliers.
 */
// Each supplier can only have one access record per BOQ
export class BoqSupplierAccess {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Parent BOQ", type: () => Boq })
  boq: Boq;

  boqId: number;

  @ApiProperty({ description: "Supplier Profile", type: () => SupplierProfile })
  supplierProfile: SupplierProfile;

  supplierProfileId: number;

  @ApiProperty({
    description: "List of BOQ sections this supplier can access",
    example: ["straight_pipes", "bends", "flanges"],
  })
  allowedSections: string[]; // Section types supplier can see

  @ApiProperty({
    description: "Supplier response status",
    enum: SupplierBoqStatus,
  })
  status: SupplierBoqStatus;

  @ApiProperty({ description: "When supplier first viewed the BOQ" })
  viewedAt?: Date;

  @ApiProperty({ description: "When supplier responded (quoted/declined)" })
  respondedAt?: Date;

  @ApiProperty({ description: "When notification was sent to supplier" })
  notificationSentAt?: Date;

  @ApiProperty({ description: "Reason for declining (if declined)" })
  declineReason?: string;

  @ApiProperty({
    description: "Days before deadline to send email reminder (1, 3, or 7)",
  })
  reminderDays?: number;

  @ApiProperty({ description: "Whether reminder email has been sent" })
  reminderSent: boolean;

  @ApiProperty({ description: "Customer info for display to supplier" })
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };

  @ApiProperty({ description: "Project info for display to supplier" })
  projectInfo?: {
    name: string;
    description?: string;
    requiredDate?: string;
  };

  @ApiProperty({
    description: "Quote data including pricing inputs and unit prices",
  })
  quoteData?: {
    pricingInputs: Record<string, any>;
    unitPrices: Record<string, Record<number, number>>;
    weldUnitPrices: Record<string, number>;
  };

  @ApiProperty({ description: "When quote progress was last saved" })
  quoteSavedAt?: Date;

  @ApiProperty({ description: "When quote was submitted" })
  quoteSubmittedAt?: Date;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
