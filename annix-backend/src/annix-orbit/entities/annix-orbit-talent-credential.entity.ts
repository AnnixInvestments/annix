import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

// Industrial Skills Passport credential, owned by a recruiter and
// attached to one of their AnnixOrbitTalentCandidate records (issue
// #362 phase 3). Mirrors the seeker-side CvCredential but is scoped to
// the recruiter's company so the dashboard's expiring-document alerts
// can be queried per tenant without a candidate join. `verified` lets a
// recruiter mark a credential as sighted/checked.
@Entity("orbit_talent_credentials")
@Index("idx_orbit_talent_credentials_candidate_expires", ["candidateId", "expiresAt"])
@Index("idx_orbit_talent_credentials_company_expires", ["companyId", "expiresAt"])
export class AnnixOrbitTalentCredential {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "credential_type", type: "varchar", length: 50 })
  credentialType: string;

  @Column({ name: "issued_at", type: "date", nullable: true })
  issuedAt: string | null;

  @Column({ name: "expires_at", type: "date", nullable: true })
  expiresAt: string | null;

  @Column({ name: "issuing_authority", type: "varchar", length: 255, nullable: true })
  issuingAuthority: string | null;

  @Column({ name: "document_path", type: "varchar", length: 500, nullable: true })
  documentPath: string | null;

  @Column({ name: "verified", type: "boolean", default: false })
  verified: boolean;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
