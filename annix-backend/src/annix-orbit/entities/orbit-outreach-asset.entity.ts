import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_outreach_assets")
@Index("idx_orbit_outreach_asset_slot", ["slot"])
export class OrbitOutreachAsset {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "slot", type: "varchar", length: 60 })
  slot: string;

  @Column({ name: "label", type: "varchar", length: 160, nullable: true })
  label: string | null;

  @Column({ name: "storage_path", type: "varchar", length: 500 })
  storagePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "content_type", type: "varchar", length: 120 })
  contentType: string;

  @Column({ name: "file_size", type: "int", default: 0 })
  fileSize: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
