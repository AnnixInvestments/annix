import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Unique } from 'typeorm';
import { FlangeDimension } from '../../flange-dimension/entities/flange-dimension.entity';

@Entity('flange_standards')
@Unique(['code'])
export class FlangeStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  code: string; // e.g. "BS 4504", "SABS 1123", "BS 10"

  @OneToMany(() => FlangeDimension, (flange) => flange.standard) // cascade maybe
  flanges: FlangeDimension[];
}
