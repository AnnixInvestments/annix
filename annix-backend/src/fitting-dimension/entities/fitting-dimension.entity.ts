import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AngleRange } from '../../angle-range/entities/angle-range.entity';
import { FittingVariant } from '../../fitting-variant/entities/fitting-variant.entity';

@Entity('fitting_dimensions')
export class FittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  dimension_name: string;

  @Column({ type: 'float' })
  dimension_value_mm: number;

  @ManyToOne(() => AngleRange, (range) => range.fittingDimensions, { nullable: true, eager: true })
  @JoinColumn({ name: 'angle_range_id' })
  angleRange: AngleRange | null;

  @ManyToOne(() => FittingVariant, (variant) => variant.dimensions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fitting_variant_id' })
  variant: FittingVariant;
}
