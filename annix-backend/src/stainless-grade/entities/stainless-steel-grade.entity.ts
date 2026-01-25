import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('stainless_steel_grades')
@Unique(['gradeNumber'])
export class StainlessSteelGrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'grade_number', type: 'varchar', length: 20 })
  gradeNumber: string;

  @Column({ name: 'uns_number', type: 'varchar', length: 20, nullable: true })
  unsNumber: string | null;

  @Column({
    name: 'en_designation',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  enDesignation: string | null;

  @Column({ name: 'en_number', type: 'varchar', length: 20, nullable: true })
  enNumber: string | null;

  @Column({ name: 'family', type: 'varchar', length: 30 })
  family: string;

  @Column({
    name: 'carbon_max_pct',
    type: 'decimal',
    precision: 6,
    scale: 4,
    nullable: true,
  })
  carbonMaxPct: number | null;

  @Column({
    name: 'chromium_min_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  chromiumMinPct: number | null;

  @Column({
    name: 'chromium_max_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  chromiumMaxPct: number | null;

  @Column({
    name: 'nickel_min_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  nickelMinPct: number | null;

  @Column({
    name: 'nickel_max_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  nickelMaxPct: number | null;

  @Column({
    name: 'molybdenum_min_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  molybdenumMinPct: number | null;

  @Column({
    name: 'molybdenum_max_pct',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  molybdenumMaxPct: number | null;

  @Column({
    name: 'nitrogen_max_pct',
    type: 'decimal',
    precision: 5,
    scale: 3,
    nullable: true,
  })
  nitrogenMaxPct: number | null;

  @Column({
    name: 'other_elements',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  otherElements: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
