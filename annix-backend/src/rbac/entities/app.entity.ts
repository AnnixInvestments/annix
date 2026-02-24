import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { AppPermission } from "./app-permission.entity";
import { AppRole } from "./app-role.entity";
import { UserAppAccess } from "./user-app-access.entity";

@Entity("apps")
export class App {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "varchar", length: 50, unique: true })
  @Index()
  @ApiProperty({
    description: "Unique code for the app",
    example: "rfq-platform",
  })
  code: string;

  @Column({ type: "varchar", length: 100 })
  @ApiProperty({
    description: "Display name of the app",
    example: "RFQ Platform",
  })
  name: string;

  @Column({ type: "text", nullable: true })
  @ApiProperty({
    description: "Description of the app",
    example: "Request for Quote management system",
    nullable: true,
  })
  description: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  @ApiProperty({
    description: "Icon identifier for the app",
    example: "file-text",
    nullable: true,
  })
  icon: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  @ApiProperty({
    description: "Whether the app is active",
    example: true,
  })
  isActive: boolean;

  @Column({ name: "display_order", type: "int", default: 0 })
  @ApiProperty({
    description: "Display order for sorting",
    example: 1,
  })
  displayOrder: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  @OneToMany(() => AppPermission, (permission) => permission.app)
  permissions: AppPermission[];

  @OneToMany(() => AppRole, (role) => role.app)
  roles: AppRole[];

  @OneToMany(() => UserAppAccess, (access) => access.app)
  userAccess: UserAppAccess[];
}
