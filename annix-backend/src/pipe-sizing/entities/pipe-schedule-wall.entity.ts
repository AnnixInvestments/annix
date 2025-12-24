import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('pipe_schedule_walls')
@Unique(['nps', 'schedule'])
export class PipeScheduleWall {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  nps: string; // e.g., "1/2", "1", "2", "6", "24"

  @Column({ type: 'varchar' })
  schedule: string; // e.g., "5S", "10", "40", "80", "160", "XXS"

  @Column({ type: 'decimal', precision: 6, scale: 4, name: 'wall_thickness_inch' })
  wallThicknessInch: number; // Wall thickness in inches

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'wall_thickness_mm' })
  wallThicknessMm: number; // Wall thickness in mm (computed)
}

@Entity('pipe_nps_od')
@Unique(['nps'])
export class PipeNpsOd {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  nps: string; // e.g., "1/2", "1", "2", "6", "24"

  @Column({ type: 'decimal', precision: 7, scale: 4, name: 'od_inch' })
  odInch: number; // Outside diameter in inches

  @Column({ type: 'decimal', precision: 7, scale: 2, name: 'od_mm' })
  odMm: number; // Outside diameter in mm
}
