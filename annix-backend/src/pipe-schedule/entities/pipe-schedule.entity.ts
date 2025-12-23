import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('pipe_schedules')
@Unique(['nps', 'schedule'])
export class PipeSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  nps: string; // Nominal Pipe Size (e.g., "1/2", "3/4", "1", "2", "6", "12", "24")

  @Column({ name: 'nb_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  nbMm: number; // Nominal Bore in mm (e.g., 15, 20, 25, 50, 150, 300, 600)

  @Column({ type: 'varchar', length: 20 })
  schedule: string; // Schedule designation (e.g., "5S", "10S", "40", "80", "160", "XXS")

  @Column({ name: 'wall_thickness_inch', type: 'decimal', precision: 8, scale: 4 })
  wallThicknessInch: number; // Wall thickness in inches

  @Column({ name: 'wall_thickness_mm', type: 'decimal', precision: 8, scale: 2 })
  wallThicknessMm: number; // Wall thickness in mm

  @Column({ name: 'outside_diameter_inch', type: 'decimal', precision: 8, scale: 4 })
  outsideDiameterInch: number; // OD in inches

  @Column({ name: 'outside_diameter_mm', type: 'decimal', precision: 8, scale: 2 })
  outsideDiameterMm: number; // OD in mm

  @Column({ name: 'standard_code', type: 'varchar', length: 50, default: 'ASME B36.10' })
  standardCode: string; // ASME B36.10 (carbon/alloy) or B36.19 (stainless)
}
