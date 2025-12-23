import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { FlangePressureClass } from '../../flange-pressure-class/entities/flange-pressure-class.entity';

@Entity('flange_pt_ratings')
@Unique(['pressureClass', 'materialGroup', 'temperatureCelsius'])
export class FlangePtRating {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FlangePressureClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pressure_class_id' })
  pressureClass: FlangePressureClass;

  @Column({ name: 'pressure_class_id' })
  pressureClassId: number;

  @Column({ name: 'material_group', type: 'varchar', length: 50 })
  materialGroup: string; // e.g., "1.1", "2.1" for carbon steel A105, or "Carbon Steel A105"

  @Column({ name: 'temperature_celsius', type: 'decimal', precision: 8, scale: 2 })
  temperatureCelsius: number; // Temperature in Celsius

  @Column({ name: 'max_pressure_bar', type: 'decimal', precision: 10, scale: 2 })
  maxPressureBar: number; // Maximum allowable pressure at this temperature in bar

  @Column({ name: 'max_pressure_psi', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPressurePsi: number; // Maximum allowable pressure at this temperature in psi
}
