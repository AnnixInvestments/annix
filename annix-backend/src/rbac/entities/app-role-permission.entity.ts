import { ApiProperty } from "@nestjs/swagger";
import { AppPermission } from "./app-permission.entity";
import { AppRole } from "./app-role.entity";

export class AppRolePermission {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  roleId: number;

  role: AppRole;

  permissionId: number;

  permission: AppPermission;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
