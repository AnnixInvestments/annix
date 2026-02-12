import { FittingBore } from "../../fitting-bore/entities/fitting-bore.entity";
import { FittingDimension } from "../../fitting-dimension/entities/fitting-dimension.entity";
import { Fitting } from "../../fitting/entities/fitting.entity";
import { Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('fitting_variants')
export class FittingVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Fitting, (fitting) => fitting.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fitting_id' })
  fitting: Fitting;

  @OneToMany(() => FittingBore, (bore) => bore.variant, { cascade: true, eager: true })
  bores: FittingBore[];

  @OneToMany(() => FittingDimension, (dim) => dim.variant, { cascade: true, eager: true })
  dimensions: FittingDimension[];
}
