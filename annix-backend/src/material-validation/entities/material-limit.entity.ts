import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";

@Entity("material_limits")
@Index(["specification_pattern"])
export class MaterialLimit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "integer", nullable: true })
  steel_specification_id: number;

  @Column({ type: "varchar", length: 255 })
  specification_pattern: string;

  @Column({ type: "varchar", length: 100 })
  material_type: string;

  @Column({ type: "integer" })
  min_temp_c: number;

  @Column({ type: "integer" })
  max_temp_c: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  max_pressure_bar: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  asme_p_number: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  asme_group_number: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  default_grade: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "boolean", default: false })
  is_seamless: boolean;

  @Column({ type: "boolean", default: false })
  is_welded: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  standard_code: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => SteelSpecification, { nullable: true })
  @JoinColumn({ name: "steel_specification_id" })
  steelSpecification: SteelSpecification;
}
