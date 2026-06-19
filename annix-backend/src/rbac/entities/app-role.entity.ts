import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { App } from "./app.entity";
import { AppRolePermission } from "./app-role-permission.entity";
import { AppRoleProduct } from "./app-role-product.entity";
import { UserAppAccess } from "./user-app-access.entity";

export enum RoleTargetType {
  CUSTOMER = "CUSTOMER",
  SUPPLIER = "SUPPLIER",
}

export class AppRole {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  appId: number;

  app: App;

  @ApiProperty({
    description: "Role code",
    example: "editor",
  })
  code: string;

  @ApiProperty({
    description: "Human-readable name",
    example: "Editor",
  })
  name: string;

  @ApiProperty({
    description: "Role description",
    example: "Can view and edit content but not manage users",
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: "Whether this is the default role for new users",
    example: false,
  })
  isDefault: boolean;

  @ApiProperty({
    description: "Display order for sorting",
    example: 1,
  })
  displayOrder: number;

  @ApiPropertyOptional({
    description: "Target type for the role (CUSTOMER or SUPPLIER). Null means applicable to both.",
    example: "CUSTOMER",
    enum: RoleTargetType,
  })
  targetType: RoleTargetType | null;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  rolePermissions: AppRolePermission[];

  userAccess: UserAppAccess[];

  roleProducts: AppRoleProduct[];
}
