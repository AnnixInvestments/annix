import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('nb_nps_lookup')
export class NbNpsLookup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  nb_mm: number; // Nominal Bore (DN) in mm

  @Column({ type: 'float' })
  nps_inch: number; // NPS in inches

  @Column({ type: 'float' })
  outside_diameter_mm: number; // OD in mm
}
