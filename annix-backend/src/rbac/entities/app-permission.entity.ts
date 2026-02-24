import { ApiProperty } from "@nestjs/swagger";
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
import { App } from "./app.entity";
import { AppRolePermission } from "./app-role-permission.entity";
import { UserAppPermission } from "./user-app-permission.entity";

@Entity("app_permissions")
@Index(["appId", "code"], { unique: true })
export class AppPermission {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "app_id" })
  appId: number;

  @ManyToOne(
    () => App,
    (app) => app.permissions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "app_id" })
  app: App;

  @Column({ type: "varchar", length: 100 })
  @Index()
  @ApiProperty({
    description: "Permission code",
    example: "rfq:create",
  })
  code: string;

  @Column({ type: "varchar", length: 100 })
  @ApiProperty({
    description: "Human-readable name",
    example: "Create RFQs",
  })
  name: string;

  @Column({ type: "text", nullable: true })
  @ApiProperty({
    description: "Permission description",
    example: "Allows users to create new RFQ requests",
    nullable: true,
  })
  description: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  @ApiProperty({
    description: "Category for grouping permissions",
    example: "RFQ Management",
    nullable: true,
  })
  category: string | null;

  @Column({ name: "display_order", type: "int", default: 0 })
  @ApiProperty({
    description: "Display order within category",
    example: 1,
  })
  displayOrder: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  @OneToMany(
    () => AppRolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: AppRolePermission[];

  @OneToMany(
    () => UserAppPermission,
    (userPermission) => userPermission.permission,
  )
  userPermissions: UserAppPermission[];
}
