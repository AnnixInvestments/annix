import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";

@Entity("comply_sa_sage_connections")
@Unique(["companyId"])
export class ComplySaSageConnection {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "access_token_encrypted", type: "text" })
  accessTokenEncrypted!: string;

  @Column({ name: "refresh_token_encrypted", type: "text" })
  refreshTokenEncrypted!: string;

  @Column({ name: "token_expires_at", type: "timestamp" })
  tokenExpiresAt!: Date;

  @Column({ name: "sage_resource_owner_id", type: "varchar", length: 255, nullable: true })
  sageResourceOwnerId!: string | null;

  @Column({ name: "last_sync_at", type: "timestamp", nullable: true })
  lastSyncAt!: Date | null;

  @CreateDateColumn({ name: "connected_at" })
  connectedAt!: Date;

  @ManyToOne(() => ComplySaCompany)
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;
}
