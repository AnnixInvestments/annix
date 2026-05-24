import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * A recorded consent for processing an education profile's data. For minors this
 * must be granted by a guardian (D3/D4); adults grant it themselves. References a
 * versioned consent text (reuses Orbit's consent-text-version machinery) and is
 * jurisdiction-tagged (POPIA/GDPR live; FERPA/COPPA slot-ready).
 */
@Entity("orbit_education_consents")
@Index("idx_orbit_education_consents_profile", ["educationProfileId"])
export class EducationConsent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "education_profile_id", type: "uuid" })
  educationProfileId: string;

  @Column({ name: "consent_text_version_id", type: "int", nullable: true })
  consentTextVersionId: number | null;

  @Column({ type: "varchar", length: 16 })
  jurisdiction: string;

  @Column({ name: "granted_by_user_id", type: "int" })
  grantedByUserId: number;

  @Column({ name: "granted_by_role", type: "varchar", length: 16 })
  grantedByRole: string;

  @Column({ name: "granted_at", type: "timestamptz" })
  grantedAt: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
