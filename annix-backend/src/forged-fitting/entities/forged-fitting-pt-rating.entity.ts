import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ForgedFittingSeries } from './forged-fitting-series.entity';

@Entity('forged_fitting_pt_ratings')
@Unique(['seriesId', 'temperatureCelsius'])
export class ForgedFittingPtRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'series_id' })
  seriesId: number;

  @ManyToOne(() => ForgedFittingSeries, (series) => series.ptRatings)
  @JoinColumn({ name: 'series_id' })
  series: ForgedFittingSeries;

  @Column({ name: 'temperature_celsius', type: 'int' })
  temperatureCelsius: number;

  @Column({ name: 'pressure_mpa', type: 'decimal', precision: 10, scale: 2 })
  pressureMpa: number;

  @Column({
    name: 'material_group',
    type: 'varchar',
    length: 50,
    default: 'Carbon Steel',
  })
  materialGroup: string;
}
