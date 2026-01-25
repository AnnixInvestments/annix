import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { ForgedFittingDimension } from './forged-fitting-dimension.entity';

@Entity('forged_fitting_types')
@Unique(['code'])
export class ForgedFittingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => ForgedFittingDimension, (dim) => dim.fittingType)
  dimensions: ForgedFittingDimension[];
}
