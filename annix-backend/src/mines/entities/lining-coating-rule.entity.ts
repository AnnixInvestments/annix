import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { RiskLevel } from './slurry-profile.entity';

@Entity('lining_coating_rules')
export class LiningCoatingRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'abrasion_level',
    type: 'enum',
    enum: RiskLevel,
  })
  abrasionLevel: RiskLevel;

  @Column({
    name: 'corrosion_level',
    type: 'enum',
    enum: RiskLevel,
  })
  corrosionLevel: RiskLevel;

  @Column({ name: 'recommended_lining', type: 'varchar', length: 255 })
  recommendedLining: string;

  @Column({ name: 'recommended_coating', type: 'varchar', length: 255, nullable: true })
  recommendedCoating: string | null;

  @Column({ name: 'application_notes', type: 'text', nullable: true })
  applicationNotes: string | null;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;
}
