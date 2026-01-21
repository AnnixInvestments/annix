import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { NominalOutsideDiameterMm } from '../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FlangeStandard } from '../../flange-standard/entities/flange-standard.entity';
import { FlangePressureClass } from '../../flange-pressure-class/entities/flange-pressure-class.entity';
import { FlangeType } from '../../flange-type/entities/flange-type.entity';
import { Bolt } from '../../bolt/entities/bolt.entity';

@Entity('flange_dimensions')
export class FlangeDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => NominalOutsideDiameterMm, (nb) => nb.id, {
    onDelete: 'CASCADE',
  })
  nominalOutsideDiameter: NominalOutsideDiameterMm;

  @ManyToOne(() => FlangeStandard, (standard) => standard.flanges, {
    onDelete: 'CASCADE',
  })
  standard: FlangeStandard;

  @ManyToOne(() => FlangePressureClass, (pc) => pc.flanges, {
    onDelete: 'CASCADE',
  })
  pressureClass: FlangePressureClass;

  @ManyToOne(() => FlangeType, { onDelete: 'SET NULL', nullable: true })
  flangeType: FlangeType | null;

  @Column({ type: 'float' })
  D: number;

  @Column({ type: 'float' })
  b: number;

  @Column({ type: 'float' })
  d4: number;

  @Column({ type: 'float' })
  f: number;

  @Column({ type: 'float' })
  num_holes: number;

  @Column({ type: 'float' })
  d1: number;

  @ManyToOne(() => Bolt, { onDelete: 'SET NULL' })
  bolt?: Bolt;

  @Column({ name: 'bolt_length_mm', type: 'float', nullable: true })
  boltLengthMm?: number;

  @Column({ type: 'float' })
  pcd: number;

  @Column({ type: 'float' })
  mass_kg: number;
}
