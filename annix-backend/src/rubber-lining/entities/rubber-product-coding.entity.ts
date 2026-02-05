import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductCodingType {
  COLOUR = 'COLOUR',
  COMPOUND = 'COMPOUND',
  CURING_METHOD = 'CURING_METHOD',
  GRADE = 'GRADE',
  HARDNESS = 'HARDNESS',
  TYPE = 'TYPE',
}

@Entity('rubber_product_coding')
export class RubberProductCoding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'firebase_uid', type: 'varchar', length: 100, unique: true })
  firebaseUid: string;

  @Column({
    name: 'coding_type',
    type: 'enum',
    enum: ProductCodingType,
  })
  codingType: ProductCodingType;

  @Column({ name: 'code', type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
