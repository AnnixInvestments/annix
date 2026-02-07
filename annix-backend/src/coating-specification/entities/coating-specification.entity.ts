import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CoatingEnvironment } from "./coating-environment.entity";

@Entity("coating_specifications")
export class CoatingSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => CoatingEnvironment,
    (env) => env.specifications,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "environment_id" })
  environment: CoatingEnvironment;

  @Column({ type: "int", name: "environment_id" })
  environmentId: number;

  @Column({ type: "varchar", name: "coating_type" })
  coatingType: string; // "external" or "internal"

  @Column({ type: "varchar" })
  lifespan: string; // "Low", "Medium", "High", "Very High" or "Per system"

  @Column({ type: "text" })
  system: string; // e.g., "Zinc-rich epoxy primer + Epoxy MIO + Polyurethane topcoat"

  @Column({ type: "varchar" })
  coats: string; // e.g., "2", "3", "2-3"

  @Column({ type: "varchar", name: "total_dft_um_range" })
  totalDftUmRange: string; // e.g., "200-240"

  @Column({ type: "text" })
  applications: string; // e.g., "External piping, chutes, tanks"

  @Column({ type: "varchar", name: "system_code", nullable: true })
  systemCode: string | null; // ISO system code e.g., "C3.07", "C4.11"

  @Column({ type: "varchar", name: "binder_type", nullable: true })
  binderType: string | null; // e.g., "AK, AY" or "EP, PUR, ESI"

  @Column({ type: "varchar", name: "primer_type", nullable: true })
  primerType: string | null; // e.g., "Misc." or "Zn (R)"

  @Column({ type: "varchar", name: "primer_ndft_um", nullable: true })
  primerNdftUm: string | null; // e.g., "60-80"

  @Column({ type: "varchar", name: "subsequent_binder", nullable: true })
  subsequentBinder: string | null; // e.g., "EP, PUR, AY"

  @Column({ type: "varchar", name: "supported_durabilities", nullable: true })
  supportedDurabilities: string | null; // comma-separated: "L,M,H,VH"

  @Column({ type: "boolean", name: "is_recommended", default: false })
  isRecommended: boolean; // true if this is the recommended system for its category
}
