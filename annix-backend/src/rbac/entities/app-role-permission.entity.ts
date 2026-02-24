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
import { AppRole } from "./app-role.entity";

@Entity("app_role_permissions")
@Index(["roleId", "permissionId"], { unique: true })
export class AppRolePermission {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "app_role_id" })
  roleId: number;

  @ManyToOne(
    () => AppRole,
    (role) => role.rolePermissions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "app_role_id" })
  role: AppRole;

  @Column({ type: "int", name: "app_permission_id" })
  permissionId: number;

  @ManyToOne(
    () => AppPermission,
    (permission) => permission.rolePermissions,
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
