import { Entity, PrimaryGeneratedColumn, Column, Unique, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Bolt } from '../../bolt/entities/bolt.entity';

@Entity('nut_masses')
// @Unique(['size', 'bolt'])
export class NutMass {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Bolt, (bolt) => bolt.nutsMasses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bolt_id' })
  bolt: Bolt;

  @ApiProperty({ example: 0.017, description: 'Mass of a single nut in kilograms' })
  @Column({ type: 'float' })
  mass_kg: number;

}
