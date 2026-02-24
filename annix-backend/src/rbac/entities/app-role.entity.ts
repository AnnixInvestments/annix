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
import { AppRolePermission } from "./app-role-permission.entity";
import { UserAppAccess } from "./user-app-access.entity";

@Entity("app_roles")
@Index(["appId", "code"], { unique: true })
export class AppRole {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "app_id" })
  appId: number;

  @ManyToOne(() => App, (app) => app.roles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "app_id" })
  app: App;

  @Column({ type: "varchar", length: 50 })
  @Index()
  @ApiProperty({
    description: "Role code",
    example: "editor",
  })
  code: string;

  @Column({ type: "varchar", length: 100 })
  @ApiProperty({
    description: "Human-readable name",
    example: "Editor",
  })
  name: string;

  @Column({ type: "text", nullable: true })
  @ApiProperty({
    description: "Role description",
    example: "Can view and edit content but not manage users",
    nullable: true,
  })
  description: string | null;

  @Column({ type: "boolean", default: false })
  @ApiProperty({
    description: "Whether this is the default role for new users",
    example: false,
  })
  isDefault: boolean;

  @Column({ type: "int", default: 0 })
  @ApiProperty({
    description: "Display order for sorting",
    example: 1,
  })
  displayOrder: number;

  @CreateDateColumn({ type: "timestamptz" })
  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  @OneToMany(() => AppRolePermission, (rolePermission) => rolePermission.role)
  rolePermissions: AppRolePermission[];

  @OneToMany(() => UserAppAccess, (userAccess) => userAccess.role)
  userAccess: UserAppAccess[];
}
