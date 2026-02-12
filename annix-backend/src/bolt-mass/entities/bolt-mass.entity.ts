import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Bolt } from '../../bolt/entities/bolt.entity';

@Entity('bolt_masses')
export class BoltMass {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Bolt, (bolt) => bolt.boltMasses, { onDelete: 'CASCADE' })
  bolt: Bolt;

  @Column()
  length_mm: number;

  @Column({ type: 'float' })
  mass_kg: number;
}
