import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('flow_coefficients')
@Unique(['material', 'condition'])
export class FlowCoefficient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  material: string;

  @Column({ type: 'varchar', length: 50 })
  condition: string;

  @Column({ name: 'hazen_williams_c', type: 'int' })
  hazenWilliamsC: number;

  @Column({
    name: 'manning_n',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  manningN: number | null;

  @Column({
    name: 'absolute_roughness_mm',
    type: 'decimal',
    precision: 6,
    scale: 4,
    nullable: true,
  })
  absoluteRoughnessMm: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;
}
