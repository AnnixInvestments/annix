import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("cv_assistant_ee_consent_text_versions")
export class CvAssistantEeConsentTextVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "version_label", type: "varchar", length: 50, unique: true })
  versionLabel: string;

  @Column({ type: "text" })
  body: string;

  @Column({ name: "effective_from", type: "timestamptz" })
  effectiveFrom: Date;

  @Column({ name: "effective_to", type: "timestamptz", nullable: true })
  effectiveTo: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
