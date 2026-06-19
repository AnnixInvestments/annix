import { ApiProperty } from "@nestjs/swagger";
import { App } from "./app.entity";
import { AppRolePermission } from "./app-role-permission.entity";
import { UserAppPermission } from "./user-app-permission.entity";

export class AppPermission {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  appId: number;

  app: App;

  @ApiProperty({
    description: "Permission code",
    example: "rfq:create",
  })
  code: string;

  @ApiProperty({
    description: "Human-readable name",
    example: "Create RFQs",
  })
  name: string;

  @ApiProperty({
    description: "Permission description",
    example: "Allows users to create new RFQ requests",
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: "Category for grouping permissions",
    example: "RFQ Management",
    nullable: true,
  })
  category: string | null;

  @ApiProperty({
    description: "Display order within category",
    example: 1,
  })
  displayOrder: number;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  rolePermissions: AppRolePermission[];

  userPermissions: UserAppPermission[];
}
