import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RubberOrder } from './rubber-order.entity';
import { RubberProduct } from './rubber-product.entity';

export interface CallOffEvent {
  timestamp: number;
  status: number;
}

export interface CallOff {
  quantity: number;
  quantityRemaining: number;
  events: CallOffEvent[];
}

@Entity('rubber_order_item')
export class RubberOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId: number;

  @ManyToOne(() => RubberOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: RubberOrder;

  @Column({
    name: 'product_firebase_uid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  productFirebaseUid: string | null;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId: number | null;

  @ManyToOne(() => RubberProduct, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: RubberProduct | null;

  @Column({
    name: 'thickness',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  thickness: number | null;

  @Column({
    name: 'width',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  width: number | null;

  @Column({
    name: 'length',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  length: number | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({
    name: 'call_offs',
    type: 'jsonb',
    default: '[]',
  })
  callOffs: CallOff[];

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
