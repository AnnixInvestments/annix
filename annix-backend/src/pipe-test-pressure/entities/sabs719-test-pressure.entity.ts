import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('sabs_719_test_pressures')
@Unique(['grade', 'nominalBoreMm', 'wallThicknessMm'])
export class Sabs719TestPressure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  grade: string;

  @Column({ name: 'nominal_bore_mm', type: 'int' })
  nominalBoreMm: number;

  @Column({ name: 'outside_diameter_mm', type: 'decimal', precision: 10, scale: 2 })
  outsideDiameterMm: number;

  @Column({ name: 'wall_thickness_mm', type: 'decimal', precision: 8, scale: 2 })
  wallThicknessMm: number;

  @Column({ name: 'test_pressure_kpa', type: 'int' })
  testPressureKpa: number;

  @Column({ name: 'yield_stress_mpa', type: 'int' })
  yieldStressMpa: number;
}
