import { ApiProperty } from "@nestjs/swagger";
import { AppRole } from "./app-role.entity";

export class AppRoleProduct {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  roleId: number;

  role: AppRole;

  @ApiProperty({
    description: "Product key (e.g., RFQ_PRODUCT_FABRICATED_STEEL)",
    example: "RFQ_PRODUCT_FABRICATED_STEEL",
  })
  productKey: string;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
