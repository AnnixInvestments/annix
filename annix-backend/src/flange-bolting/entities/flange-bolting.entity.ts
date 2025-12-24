import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { FlangeStandard } from '../../flange-standard/entities/flange-standard.entity';

@Entity('flange_bolting')
@Unique(['standardId', 'pressureClass', 'nps'])
export class FlangeBolting {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FlangeStandard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'standard_id' })
  standard: FlangeStandard;

  @Column({ type: 'int', name: 'standard_id' })
  standardId: number;

  @Column({ type: 'varchar', name: 'pressure_class' })
  pressureClass: string; // e.g., "150", "300", "600"

  @Column({ type: 'varchar' })
  nps: string; // e.g., "0.5", "1", "24"

  @Column({ type: 'int', name: 'num_bolts' })
  numBolts: number;

  @Column({ type: 'decimal', precision: 5, scale: 3, name: 'bolt_dia' })
  boltDia: number; // Bolt diameter in inches

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'bolt_length_default', nullable: true })
  boltLengthDefault: number | null; // Default bolt length (usually for WN flanges)

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'bolt_length_so_sw_th', nullable: true })
  boltLengthSoSwTh: number | null; // Bolt length for SO, SW, Threaded flanges

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'bolt_length_lj', nullable: true })
  boltLengthLj: number | null; // Bolt length for Lap Joint flanges
}
