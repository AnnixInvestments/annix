import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hdpe_standards')
export class HdpeStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string; // e.g., 'ISO_4427', 'EN_12201', 'ASTM_F714'

  @Column({ type: 'varchar', length: 200 })
  name: string; // Full name of the standard

  @Column({ type: 'text' })
  description: string; // Description of what this standard covers

  @Column({ type: 'varchar', length: 100, nullable: true })
  organization: string; // ISO, ASTM, EN, AWWA, etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  region: string; // International, US, EU, etc.

  @Column({ name: 'applicable_to', type: 'varchar', length: 100, nullable: true })
  applicableTo: string; // pipes, fittings, both

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
