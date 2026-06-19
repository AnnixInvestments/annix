import { ApiProperty } from "@nestjs/swagger";
import { AppPermission } from "./app-permission.entity";
import { UserAppAccess } from "./user-app-access.entity";

export class UserAppPermission {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  userAccessId: number;

  userAccess: UserAppAccess;

  permissionId: number;

  permission: AppPermission;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
