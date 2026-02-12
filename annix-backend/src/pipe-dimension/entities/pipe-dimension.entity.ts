import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { NominalOutsideDiameterMm } from '../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity';
import { PipePressure } from '../../pipe-pressure/entities/pipe-pressure.entity';
import { SteelSpecification } from '../../steel-specification/entities/steel-specification.entity';

@Entity('pipe_dimensions')
export class PipeDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  wall_thickness_mm: number;

  @Column({ type: 'float', nullable: true })
  internal_diameter_mm: number | null;

  @Column({ type: 'float' })
  mass_kgm: number;

  @Column({ type: 'varchar', nullable: true })
  schedule_designation: string | null;

  @Column({ type: 'float', nullable: true })
  schedule_number: number | null;

  @ManyToOne(() => NominalOutsideDiameterMm, (nominal) => nominal.pipeDimensions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nominal_outside_diameter_id' })
  nominalOutsideDiameter: NominalOutsideDiameterMm;

  @OneToMany(() => PipePressure, (pressure) => pressure.pipeDimension, {
    cascade: true,
  })
  pressures: PipePressure[];

  @ManyToOne(() => SteelSpecification, (spec) => spec.pipeDimensions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'steel_specification_id' })
  steelSpecification: SteelSpecification;
}
