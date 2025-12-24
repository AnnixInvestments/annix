import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { CoatingStandard } from './coating-standard.entity';
import { CoatingSpecification } from './coating-specification.entity';

@Entity('coating_environments')
@Unique(['standardId', 'category'])
export class CoatingEnvironment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CoatingStandard, (standard) => standard.environments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'standard_id' })
  standard: CoatingStandard;

  @Column({ type: 'int', name: 'standard_id' })
  standardId: number;

  @Column({ type: 'varchar' })
  category: string; // e.g., "C1", "C2", "C3", "C4", "C5", "CX", "Im1-Im3"

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', name: 'surface_preparation' })
  surfacePreparation: string;

  @OneToMany(() => CoatingSpecification, (spec) => spec.environment)
  specifications: CoatingSpecification[];
}
