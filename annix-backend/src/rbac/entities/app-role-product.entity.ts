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
import { AppRole } from "./app-role.entity";

@Entity("app_role_products")
@Index(["roleId", "productKey"], { unique: true })
export class AppRoleProduct {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "role_id" })
  roleId: number;

  @ManyToOne(
    () => AppRole,
    (role) => role.roleProducts,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "role_id" })
  role: AppRole;

  @Column({ type: "varchar", length: 100, name: "product_key" })
  @Index()
  @ApiProperty({
    description: "Product key (e.g., RFQ_PRODUCT_FABRICATED_STEEL)",
    example: "RFQ_PRODUCT_FABRICATED_STEEL",
  })
  productKey: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;
}
