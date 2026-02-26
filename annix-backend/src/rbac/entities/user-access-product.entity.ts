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
import { UserAppAccess } from "./user-app-access.entity";

@Entity("user_access_products")
@Index(["userAccessId", "productKey"], { unique: true })
export class UserAccessProduct {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: "Unique identifier", example: 1 })
  id: number;

  @Column({ type: "int", name: "user_app_access_id" })
  userAccessId: number;

  @ManyToOne(
    () => UserAppAccess,
    (access) => access.userProducts,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "user_app_access_id" })
  userAccess: UserAppAccess;

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
