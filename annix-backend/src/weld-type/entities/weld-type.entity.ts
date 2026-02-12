import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('weld_types')
@Unique(['weld_code'])
export class WeldType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  weld_code: string; // e.g. "FW_STR", "BW_NO_XRAY", "MW"

  @Column({ type: 'varchar', length: 200 })
  weld_name: string; // e.g. "Flange Weld - Straight"

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string; // e.g. "FLANGE", "BUTT", "BRANCH"

  @Column({ type: 'text', nullable: true })
  description: string; // Detailed description

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Note: PipeEndConfiguration relationship will be added when that entity is created
}
