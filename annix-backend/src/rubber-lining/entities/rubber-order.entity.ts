import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RubberOrderItem } from './rubber-order-item.entity';
import { RubberCompany } from './rubber-company.entity';

export enum RubberOrderStatus {
  NEW = -1,
  DRAFT = 0,
  CANCELLED = 1,
  PARTIALLY_SUBMITTED = 2,
  SUBMITTED = 3,
  MANUFACTURING = 4,
  DELIVERING = 5,
  COMPLETE = 6,
}

export interface StatusHistoryEvent {
  timestamp: number;
  fromStatus: RubberOrderStatus;
  toStatus: RubberOrderStatus;
  changedBy?: string;
  notes?: string;
}

@Entity('rubber_order')
export class RubberOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'firebase_uid', type: 'varchar', length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({
    name: 'company_order_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  companyOrderNumber: string | null;

  @Column({
    name: 'status',
    type: 'int',
    default: RubberOrderStatus.DRAFT,
  })
  status: RubberOrderStatus;

  @Column({
    name: 'company_firebase_uid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  companyFirebaseUid: string | null;

  @Column({ name: 'company_id', type: 'int', nullable: true })
  companyId: number | null;

  @ManyToOne(() => RubberCompany, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: RubberCompany | null;

  @OneToMany(() => RubberOrderItem, (item) => item.order, { cascade: true })
  items: RubberOrderItem[];

  @Column({
    name: 'created_by_firebase_uid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  createdByFirebaseUid: string | null;

  @Column({
    name: 'updated_by_firebase_uid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  updatedByFirebaseUid: string | null;

  @Column({
    name: 'status_history',
    type: 'jsonb',
    default: '[]',
  })
  statusHistory: StatusHistoryEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
