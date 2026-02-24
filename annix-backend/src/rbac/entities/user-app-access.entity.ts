import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { App } from "./app.entity";
import { AppRole } from "./app-role.entity";
import { UserAppPermission } from "./user-app-permission.entity";
import { User } from "../../user/entities/user.entity";

@Entity("user_app_access")
@Index(["userId", "appId"], { unique: true })
export class UserAppAccess {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "int", name: "app_id" })
  appId: number;

  @ManyToOne(() => App, (app) => app.userAccess, { onDelete: "CASCADE" })
  @JoinColumn({ name: "app_id" })
  app: App;

  @Column({ type: "int", name: "app_role_id", nullable: true })
  roleId: number | null;

  @ManyToOne(() => AppRole, (role) => role.userAccess, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "app_role_id" })
  role: AppRole | null;

  @Column({ type: "boolean", default: false, name: "use_custom_permissions" })
  @ApiProperty({
    description:
      "When true, user has custom permissions instead of role-based",
    example: false,
  })
  useCustomPermissions: boolean;

  @Column({ type: "int", name: "granted_by", nullable: true })
  grantedById: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "granted_by" })
  grantedBy: User | null;

  @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
  @ApiProperty({
    description: "When this access expires (null = never)",
    nullable: true,
  })
  expiresAt: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "granted_at" })
  @ApiProperty({ description: "When access was granted" })
  grantedAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  @OneToMany(
    () => UserAppPermission,
    (userPermission) => userPermission.userAccess,
    { cascade: true },
  )
  customPermissions: UserAppPermission[];
}
