import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ReturnSession } from "./return-session.entity";

export type PaintReturnCondition = "usable" | "contaminated";

@Entity("sm_paint_return")
export class PaintReturn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ReturnSession,
    (session) => session.paintReturns,
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

  @Column({ name: "source_product_id", type: "integer", nullable: true })
  sourceProductId: number | null;

  @Column({
    name: "litres_returned",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  litresReturned: number;

  @Column({ name: "condition", type: "varchar", length: 32 })
  condition: PaintReturnCondition;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
