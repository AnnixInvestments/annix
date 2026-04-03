import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberMonthlyAccount } from "./rubber-monthly-account.entity";

export enum SignOffStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

@Entity("rubber_account_sign_offs")
export class RubberAccountSignOff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "monthly_account_id", type: "int" })
  monthlyAccountId: number;

  @ManyToOne(() => RubberMonthlyAccount)
  @JoinColumn({ name: "monthly_account_id" })
  monthlyAccount: RubberMonthlyAccount;

  @Column({ name: "director_name", type: "varchar", length: 200 })
  directorName: string;

  @Column({ name: "director_email", type: "varchar", length: 200 })
  directorEmail: string;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: SignOffStatus.PENDING,
  })
  status: SignOffStatus;

  @Column({ name: "signed_at", type: "timestamp", nullable: true })
  signedAt: Date | null;

  @Column({ name: "sign_off_token", type: "varchar", length: 100, unique: true })
  signOffToken: string;

  @Column({ name: "token_expires_at", type: "timestamp" })
  tokenExpiresAt: Date;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
