import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { AnsiB169FittingDimension } from './ansi-b16-9-fitting-dimension.entity';

@Entity('ansi_b16_9_fitting_types')
@Unique(['code'])
export class AnsiB169FittingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => AnsiB169FittingDimension, (dim) => dim.fittingType)
  dimensions: AnsiB169FittingDimension[];
}
