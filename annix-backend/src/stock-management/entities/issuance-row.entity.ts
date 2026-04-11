import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ConsumableIssuanceRow } from "./consumable-issuance-row.entity";
import { IssuableProduct } from "./issuable-product.entity";
import { IssuanceSession } from "./issuance-session.entity";
import { PaintIssuanceRow } from "./paint-issuance-row.entity";
import { RubberRollIssuanceRow } from "./rubber-roll-issuance-row.entity";
import { SolutionIssuanceRow } from "./solution-issuance-row.entity";

export type IssuanceRowType = "consumable" | "paint" | "rubber_roll" | "solution";

@Entity("sm_issuance_row")
export class IssuanceRow {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => IssuanceSession,
    (session) => session.rows,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "session_id" })
  session: IssuanceSession;

  @Column({ name: "session_id", type: "integer" })
  sessionId: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "row_type", type: "varchar", length: 32 })
  rowType: IssuanceRowType;

  @ManyToOne(() => IssuableProduct, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "product_id", type: "integer" })
  productId: number;

  @Column({ name: "job_card_id", type: "integer", nullable: true })
  jobCardId: number | null;

  @Column({ name: "undone", type: "boolean", default: false })
  undone: boolean;

  @Column({ name: "undone_at", type: "timestamp", nullable: true })
  undoneAt: Date | null;

  @Column({ name: "undone_by_staff_id", type: "integer", nullable: true })
  undoneByStaffId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToOne(
    () => ConsumableIssuanceRow,
    (child) => child.row,
  )
  consumable?: ConsumableIssuanceRow | null;

  @OneToOne(
    () => PaintIssuanceRow,
    (child) => child.row,
  )
  paint?: PaintIssuanceRow | null;

  @OneToOne(
    () => RubberRollIssuanceRow,
    (child) => child.row,
  )
  rubberRoll?: RubberRollIssuanceRow | null;

  @OneToOne(
    () => SolutionIssuanceRow,
    (child) => child.row,
  )
  solution?: SolutionIssuanceRow | null;
}
