import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Bolt } from '../../bolt/entities/bolt.entity';

@Entity('washers')
export class Washer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Bolt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bolt_id' })
  bolt: Bolt;

  @ApiProperty({
    example: 'split',
    description: 'Type of washer (flat, split, tooth, belleville)',
  })
  @Column({ type: 'varchar' })
  type: string;

  @ApiProperty({
    example: 'Carbon Steel',
    description: 'Washer material',
  })
  @Column({ type: 'varchar', nullable: true })
  material: string | null;

  @ApiProperty({
    example: 0.012,
    description: 'Mass of a single washer in kilograms',
  })
  @Column({ type: 'float' })
  massKg: number;

  @ApiProperty({
    example: 20.0,
    description: 'Outside diameter in mm',
  })
  @Column({ name: 'od_mm', type: 'float', nullable: true })
  odMm: number | null;

  @ApiProperty({
    example: 10.5,
    description: 'Inside diameter in mm',
  })
  @Column({ name: 'id_mm', type: 'float', nullable: true })
  idMm: number | null;

  @ApiProperty({
    example: 2.5,
    description: 'Thickness in mm',
  })
  @Column({ name: 'thickness_mm', type: 'float', nullable: true })
  thicknessMm: number | null;
}
