import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { RubberType } from './rubber-type.entity';

@Entity('rubber_chemical_compatibility')
@Unique(['rubberTypeId', 'chemical', 'concentration', 'temperatureC'])
export class RubberChemicalCompatibility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rubber_type_id', type: 'int' })
  rubberTypeId: number;

  @ManyToOne(() => RubberType)
  @JoinColumn({ name: 'rubber_type_id' })
  rubberType: RubberType;

  @Column({ type: 'varchar', length: 100 })
  chemical: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  concentration: string | null;

  @Column({ name: 'temperature_c', type: 'int' })
  temperatureC: number;

  @Column({ type: 'varchar', length: 2 })
  rating: string;

  @Column({ name: 'iso_tr_7620_ref', type: 'varchar', length: 50, nullable: true })
  isoTr7620Ref: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;
}
