// export class FittingBore {}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Fitting } from '../../fitting/entities/fitting.entity';
import { NominalOutsideDiameterMm } from '../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { FittingVariant } from '../../fitting-variant/entities/fitting-variant.entity';

@Entity('fitting_bores')
export class FittingBore {
  @PrimaryGeneratedColumn({ name: 'fitting_bore_id' })
  id: number;

  @Column({ name: 'bore_position', type: 'text' })
  borePositionName: string;

  @ManyToOne(() => NominalOutsideDiameterMm, (nominal) => nominal.fittingBores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nominal_outside_diameter_id' })
  nominalOutsideDiameter: NominalOutsideDiameterMm;

  @ManyToOne(() => FittingVariant, (variant) => variant.bores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fitting_variant_id' })
  variant: FittingVariant;
}
