import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('abrasion_resistance')
@Unique(['material', 'testCondition', 'sandConcentrationPct'])
export class AbrasionResistance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  material: string;

  @Column({ name: 'test_condition', type: 'varchar', length: 100 })
  testCondition: string;

  @Column({ name: 'sand_concentration_pct', type: 'int' })
  sandConcentrationPct: number;

  @Column({ name: 'velocity_m_s', type: 'decimal', precision: 5, scale: 2, nullable: true })
  velocityMS: number | null;

  @Column({ name: 'pressure_mpa', type: 'decimal', precision: 6, scale: 2, nullable: true })
  pressureMpa: number | null;

  @Column({ name: 'temperature_c', type: 'varchar', length: 20, nullable: true })
  temperatureC: string | null;

  @Column({ name: 'time_to_rupture_hours', type: 'int', nullable: true })
  timeToRuptureHours: number | null;

  @Column({ name: 'wall_thickness_mm', type: 'decimal', precision: 5, scale: 2, nullable: true })
  wallThicknessMm: number | null;

  @Column({ name: 'pipe_specification', type: 'varchar', length: 100, nullable: true })
  pipeSpecification: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;
}
