import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("forged_fitting_class_ratings")
@Unique(["standard", "fittingClass", "connectionType", "materialGroup", "temperatureC"])
export class ForgedFittingClassRating {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Standard reference", example: "ASME B16.11" })
  @Column({ type: "varchar", length: 20 })
  standard: string;

  @ApiProperty({ description: "Fitting pressure class", example: 3000 })
  @Column({ name: "fitting_class", type: "int" })
  fittingClass: number;

  @ApiProperty({ description: "Connection type (SW=Socket Weld, THRD=Threaded)", example: "SW" })
  @Column({ name: "connection_type", type: "varchar", length: 10 })
  connectionType: string;

  @ApiProperty({ description: "Material group per B16.5", example: "1.1" })
  @Column({ name: "material_group", type: "varchar", length: 10 })
  materialGroup: string;

  @ApiProperty({ description: "Temperature in Celsius", example: 38 })
  @Column({ name: "temperature_c", type: "int" })
  temperatureC: number;

  @ApiProperty({ description: "Maximum working pressure in bar", example: 209 })
  @Column({ name: "max_pressure_bar", type: "decimal", precision: 7, scale: 2 })
  maxPressureBar: number;

  @ApiProperty({ description: "Socket depth multiplier (times NPS)", example: 1.0 })
  @Column({
    name: "socket_depth_multiplier",
    type: "decimal",
    precision: 3,
    scale: 1,
    nullable: true,
  })
  socketDepthMultiplier: number | null;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
