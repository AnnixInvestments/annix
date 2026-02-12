import { FittingBore } from '../../fitting-bore/entities/fitting-bore.entity';
import { PipeDimension } from '../../pipe-dimension/entities/pipe-dimension.entity';
import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany } from 'typeorm';
import { FlangeDimension } from '../../flange-dimension/entities/flange-dimension.entity';

@Entity('nominal_outside_diameters')
@Unique(['nominal_diameter_mm', 'outside_diameter_mm']) // ensure that there are no duplicate combinations
export class NominalOutsideDiameterMm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  nominal_diameter_mm: number;

  @Column({ type: 'float' })
  outside_diameter_mm: number;  
  
  @OneToMany(() => PipeDimension, (pipeDimension) => pipeDimension.nominalOutsideDiameter, {
    cascade: true,
  })
  pipeDimensions: PipeDimension[];

  @OneToMany(() => FittingBore, (bore) => bore.nominalOutsideDiameter, {
    cascade: true,
  })
  fittingBores: FittingBore[];

  @OneToMany(() => FlangeDimension, (flange) => flange.nominalOutsideDiameter)
  flangeDimensions: FlangeDimension[];
}
