import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("rubber_product")
export class RubberProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "title", type: "varchar", length: 200, nullable: true })
  title: string | null;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({
    name: "specific_gravity",
    type: "decimal",
    precision: 10,
    scale: 4,
    nullable: true,
  })
  specificGravity: number | null;

  @Column({
    name: "compound_owner_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  compoundOwnerFirebaseUid: string | null;

  @Column({
    name: "compound_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  compoundFirebaseUid: string | null;

  @Column({
    name: "type_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  typeFirebaseUid: string | null;

  @Column({
    name: "cost_per_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPerKg: number | null;

  @Column({
    name: "colour_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  colourFirebaseUid: string | null;

  @Column({
    name: "hardness_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  hardnessFirebaseUid: string | null;

  @Column({
    name: "curing_method_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  curingMethodFirebaseUid: string | null;

  @Column({
    name: "grade_firebase_uid",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  gradeFirebaseUid: string | null;

  @Column({
    name: "markup",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  markup: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
