import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('hdpe_chemical_resistance')
@Unique(['substance', 'concentration', 'temperatureC'])
export class HdpeChemicalResistance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  substance: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  concentration: string | null;

  @Column({ name: 'temperature_c', type: 'int' })
  temperatureC: number;

  @Column({ name: 'hdpe_rating', type: 'varchar', length: 5 })
  hdpeRating: string;

  @Column({ name: 'pp_rating', type: 'varchar', length: 5, nullable: true })
  ppRating: string | null;

  @Column({
    name: 'fcr_factor',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  fcrFactor: number | null;

  @Column({
    name: 'fcrt_factor',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  fcrtFactor: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;
}
