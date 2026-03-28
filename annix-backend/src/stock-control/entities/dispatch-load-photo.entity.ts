import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("dispatch_load_photos")
export class DispatchLoadPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.dispatchLoadPhotos,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "file_path", type: "varchar", length: 500 })
  filePath: string;

  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ type: "text", nullable: true })
  caption: string | null;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "uploaded_by_id" })
  uploadedBy: StockControlUser | null;

  @Column({ name: "uploaded_by_id", nullable: true })
  uploadedById: number | null;

  @Column({ name: "uploaded_by_name", type: "varchar", length: 255, nullable: true })
  uploadedByName: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
