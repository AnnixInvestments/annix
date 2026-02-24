import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AppPermission } from "./app-permission.entity";
import { UserAppAccess } from "./user-app-access.entity";

@Entity("user_app_permissions")
@Index(["userAccessId", "permissionId"], { unique: true })
export class UserAppPermission {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "user_app_access_id" })
  userAccessId: number;

  @ManyToOne(
    () => UserAppAccess,
    (access) => access.customPermissions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "user_app_access_id" })
  userAccess: UserAppAccess;

  @Column({ type: "int", name: "app_permission_id" })
  permissionId: number;

  @ManyToOne(
    () => AppPermission,
    (permission) => permission.userPermissions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "app_permission_id" })
  permission: AppPermission;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
