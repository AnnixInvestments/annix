import { ApiProperty } from "@nestjs/swagger";
import { UserAppAccess } from "./user-app-access.entity";

export class UserAccessProduct {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  userAccessId: number;

  userAccess: UserAppAccess;

  @ApiProperty({
    description: "Product key (e.g., RFQ_PRODUCT_FABRICATED_STEEL)",
    example: "RFQ_PRODUCT_FABRICATED_STEEL",
  })
  productKey: string;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
