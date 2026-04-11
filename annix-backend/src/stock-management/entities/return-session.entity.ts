import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberOffcutReturn } from "./rubber-offcut-return.entity";

export type ReturnSessionKind =
  | "rubber_offcut"
  | "paint_litres"
  | "consumable_qty"
  | "solution_volume"
  | "other";

export type ReturnSessionStatus = "pending" | "confirmed" | "rejected" | "cancelled";

@Entity("sm_return_session")
export class ReturnSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "return_kind", type: "varchar", length: 32 })
  returnKind: ReturnSessionKind;

  @Column({ name: "target_issuance_row_id", type: "integer", nullable: true })
  targetIssuanceRowId: number | null;

  @Column({ name: "target_session_id", type: "integer", nullable: true })
  targetSessionId: number | null;

  @Column({ name: "target_job_card_id", type: "integer", nullable: true })
  targetJobCardId: number | null;

  @Column({ name: "returned_by_staff_id", type: "integer", nullable: true })
  returnedByStaffId: number | null;

  @Column({ name: "confirmed_by_staff_id", type: "integer", nullable: true })
  confirmedByStaffId: number | null;

  @Column({ name: "status", type: "varchar", length: 32, default: "pending" })
  status: ReturnSessionStatus;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => RubberOffcutReturn,
    (offcut) => offcut.returnSession,
  )
  offcutReturns: RubberOffcutReturn[];
}
