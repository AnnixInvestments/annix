import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BoltMass } from '../../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../../nut-mass/entities/nut-mass.entity';

@Entity('bolts')
export class Bolt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  designation: string; // e.g. "M12", "M16"

  @OneToMany(() => BoltMass, (mass) => mass.bolt)
  boltMasses: BoltMass[];

  @OneToMany(() => NutMass, (nut) => nut.bolt)
  nutsMasses: NutMass[];
}
