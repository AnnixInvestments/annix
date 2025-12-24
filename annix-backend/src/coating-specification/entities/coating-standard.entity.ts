import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { CoatingEnvironment } from './coating-environment.entity';

@Entity('coating_standards')
@Unique(['code'])
export class CoatingStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  code: string; // e.g., "ISO 12944", "NORSOK M-501"

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', name: 'general_surface_preparation' })
  generalSurfacePreparation: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => CoatingEnvironment, (env) => env.standard)
  environments: CoatingEnvironment[];
}
