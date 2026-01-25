import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { ForgedFittingDimension } from './forged-fitting-dimension.entity';
import { ForgedFittingPtRating } from './forged-fitting-pt-rating.entity';

@Entity('forged_fitting_series')
@Unique(['pressureClass', 'connectionType'])
export class ForgedFittingSeries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pressure_class', type: 'int' })
  pressureClass: number;

  @Column({ name: 'connection_type', type: 'varchar', length: 20 })
  connectionType: string;

  @Column({
    name: 'standard_code',
    type: 'varchar',
    length: 50,
    default: 'ASME B16.11',
  })
  standardCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => ForgedFittingDimension, (dim) => dim.series)
  dimensions: ForgedFittingDimension[];

  @OneToMany(() => ForgedFittingPtRating, (rating) => rating.series)
  ptRatings: ForgedFittingPtRating[];
}
