import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "extraction_metric" })
@Index(["category", "operation", "succeeded", "createdAt"])
export class ExtractionMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64 })
  category: string;

  @Column({ type: "varchar", length: 64, default: "" })
  operation: string;

  @Column({ name: "duration_ms", type: "int" })
  durationMs: number;

  @Column({ name: "payload_size_bytes", type: "int", nullable: true })
  payloadSizeBytes: number | null;

  @Column({ type: "boolean", default: true })
  succeeded: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
