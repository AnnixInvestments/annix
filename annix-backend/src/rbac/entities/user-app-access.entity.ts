import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { App } from "./app.entity";
import { AppRole } from "./app-role.entity";
import { UserAccessProduct } from "./user-access-product.entity";
import { UserAppPermission } from "./user-app-permission.entity";

export class UserAppAccess {
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  userId: number;

  user: User;

  appId: number;

  app: App;

  roleId: number | null;

  role: AppRole | null;

  @ApiProperty({
    description: "When true, user has custom permissions instead of role-based",
    example: false,
  })
  useCustomPermissions: boolean;

  grantedById: number | null;

  grantedBy: User | null;

  @ApiProperty({
    description: "When this access expires (null = never)",
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({ description: "When access was granted" })
  grantedAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  customPermissions: UserAppPermission[];

  userProducts: UserAccessProduct[];
}
