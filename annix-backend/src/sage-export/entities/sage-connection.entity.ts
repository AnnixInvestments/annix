import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("sage_connections")
export class SageConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "app_key", type: "varchar", length: 50, unique: true })
  appKey: string;

  @Column({ name: "sage_username", type: "varchar", length: 255, nullable: true })
  sageUsername: string | null;

  @Column({ name: "sage_pass_encrypted", type: "bytea", nullable: true })
  sagePassEncrypted: Buffer | null;

  @Column({ name: "sage_company_id", type: "int", nullable: true })
  sageCompanyId: number | null;

  @Column({ name: "sage_company_name", type: "varchar", length: 255, nullable: true })
  sageCompanyName: string | null;

  @Column({ name: "enabled", type: "boolean", default: false })
  enabled: boolean;

  @Column({ name: "connected_at", type: "timestamp", nullable: true })
  connectedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
