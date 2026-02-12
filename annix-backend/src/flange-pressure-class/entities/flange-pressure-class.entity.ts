import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { FlangeStandard } from '../../flange-standard/entities/flange-standard.entity';
import { FlangeDimension } from '../../flange-dimension/entities/flange-dimension.entity';

@Entity('flange_pressure_classes')
export class FlangePressureClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  designation: string; // e.g. "6/3", "10/3", "T/D"

  @ManyToOne(() => FlangeStandard, (standard) => standard.id, { onDelete: 'CASCADE' })
  standard: FlangeStandard;

  @OneToMany(() => FlangeDimension, (flange) => flange.pressureClass)
  flanges: FlangeDimension[];
}
