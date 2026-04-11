import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ReturnSession } from "./return-session.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_rubber_offcut_return")
export class RubberOffcutReturn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ReturnSession,
    (session) => session.offcutReturns,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "return_session_id" })
  returnSession: ReturnSession;

  @Column({ name: "return_session_id", type: "integer" })
  returnSessionId: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "source_issuance_row_id", type: "integer", nullable: true })
  sourceIssuanceRowId: number | null;

  @Column({ name: "source_rubber_roll_id", type: "integer", nullable: true })
  sourceRubberRollId: number | null;

  @Column({ name: "offcut_number", type: "varchar", length: 100, nullable: true })
  offcutNumber: string | null;

  @Column({
    name: "width_mm",
    type: "numeric",
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  widthMm: number;

  @Column({
    name: "length_m",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  lengthM: number;

  @Column({
    name: "thickness_mm",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  thicknessMm: number;

  @Column({
    name: "computed_weight_kg",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  computedWeightKg: number | null;

  @Column({ name: "compound_id", type: "integer", nullable: true })
  compoundId: number | null;

  @Column({ name: "compound_code", type: "varchar", length: 100, nullable: true })
  compoundCode: string | null;

  @Column({ name: "colour", type: "varchar", length: 64, nullable: true })
  colour: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "creates_offcut_product_id", type: "integer", nullable: true })
  createsOffcutProductId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
