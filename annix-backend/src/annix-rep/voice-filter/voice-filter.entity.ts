import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("annix_rep_voice_profiles")
export class VoiceProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", unique: true })
  userId: number;

  @Column({ name: "enrolled", default: false })
  enrolled: boolean;

  @Column({ name: "aws_speaker_id", type: "varchar", length: 255, nullable: true })
  awsSpeakerId: string | null;

  @Column({ name: "aws_domain_id", type: "varchar", length: 255, nullable: true })
  awsDomainId: string | null;

  @Column({ name: "enrolled_at", type: "timestamp", nullable: true })
  enrolledAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
