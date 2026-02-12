import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { FittingDimension } from '../../fitting-dimension/entities/fitting-dimension.entity';

@Entity('angle_ranges')
export class AngleRange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  angle_min: number;

  @Column({ type: 'float' })
  angle_max: number;

  @OneToMany(() => FittingDimension, (dim) => dim.angleRange)
  fittingDimensions: FittingDimension[];
}
