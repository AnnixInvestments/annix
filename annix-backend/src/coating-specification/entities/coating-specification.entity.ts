import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CoatingEnvironment } from './coating-environment.entity';

@Entity('coating_specifications')
export class CoatingSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CoatingEnvironment, (env) => env.specifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environment_id' })
  environment: CoatingEnvironment;

  @Column({ type: 'int', name: 'environment_id' })
  environmentId: number;

  @Column({ type: 'varchar', name: 'coating_type' })
  coatingType: string; // "external" or "internal"

  @Column({ type: 'varchar' })
  lifespan: string; // "Low", "Medium", "High", "Very High"

  @Column({ type: 'text' })
  system: string; // e.g., "Zinc-rich epoxy primer + Epoxy MIO + Polyurethane topcoat"

  @Column({ type: 'varchar' })
  coats: string; // e.g., "2", "3", "2-3"

  @Column({ type: 'varchar', name: 'total_dft_um_range' })
  totalDftUmRange: string; // e.g., "200-240"

  @Column({ type: 'text' })
  applications: string; // e.g., "External piping, chutes, tanks"
}
