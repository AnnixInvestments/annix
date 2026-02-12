import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { Fitting } from '../../fitting/entities/fitting.entity';

@Entity('fitting_types')
@Unique(['name'])
export class FittingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @OneToMany(() => Fitting, (fitting) => fitting.fittingType)
  fittings: Fitting[];
}
