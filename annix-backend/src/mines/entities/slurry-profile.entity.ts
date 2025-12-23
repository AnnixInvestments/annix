import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Commodity } from './commodity.entity';

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  VERY_HIGH = 'Very High',
}

@Entity('slurry_profiles')
export class SlurryProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Commodity, (commodity) => commodity.slurryProfiles)
  @JoinColumn({ name: 'commodity_id' })
  commodity: Commodity;

  @Column({ name: 'commodity_id' })
  commodityId: number;

  @Column({ name: 'profile_name', type: 'varchar', length: 255, nullable: true })
  profileName: string | null;

  // Specific Gravity (SG) range
  @Column({ name: 'typical_sg_min', type: 'decimal', precision: 5, scale: 3 })
  typicalSgMin: number;

  @Column({ name: 'typical_sg_max', type: 'decimal', precision: 5, scale: 3 })
  typicalSgMax: number;

  // Solids concentration (% w/w)
  @Column({ name: 'solids_concentration_min', type: 'decimal', precision: 5, scale: 2 })
  solidsConcentrationMin: number;

  @Column({ name: 'solids_concentration_max', type: 'decimal', precision: 5, scale: 2 })
  solidsConcentrationMax: number;

  // pH range
  @Column({ name: 'ph_min', type: 'decimal', precision: 4, scale: 2 })
  phMin: number;

  @Column({ name: 'ph_max', type: 'decimal', precision: 4, scale: 2 })
  phMax: number;

  // Temperature range (°C)
  @Column({ name: 'temp_min', type: 'decimal', precision: 5, scale: 2 })
  tempMin: number;

  @Column({ name: 'temp_max', type: 'decimal', precision: 5, scale: 2 })
  tempMax: number;

  // Risk levels
  @Column({
    name: 'abrasion_risk',
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM,
  })
  abrasionRisk: RiskLevel;

  @Column({
    name: 'corrosion_risk',
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM,
  })
  corrosionRisk: RiskLevel;

  @Column({ name: 'primary_failure_mode', type: 'varchar', length: 255, nullable: true })
  primaryFailureMode: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
