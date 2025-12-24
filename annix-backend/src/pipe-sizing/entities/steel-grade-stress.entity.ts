import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';

@Entity('pipe_steel_grades')
@Unique(['code'])
export class PipeSteelGrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  code: string; // e.g., "ASTM_A106_Grade_B"

  @Column({ type: 'varchar' })
  name: string; // e.g., "ASTM A106 Grade B (Seamless high-temp service)"

  @Column({ type: 'varchar', nullable: true })
  category: string; // "carbon_steel", "stainless_steel", "alloy_steel"

  @Column({ type: 'varchar', name: 'equivalent_grade', nullable: true })
  equivalentGrade: string | null; // For SABS grades that map to ASTM equivalents

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}

@Entity('pipe_allowable_stresses')
@Unique(['gradeId', 'temperatureF'])
export class PipeAllowableStress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PipeSteelGrade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grade_id' })
  grade: PipeSteelGrade;

  @Column({ type: 'int', name: 'grade_id' })
  gradeId: number;

  @Column({ type: 'int', name: 'temperature_f' })
  temperatureF: number; // Temperature in Fahrenheit

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'allowable_stress_ksi' })
  allowableStressKsi: number; // Allowable stress in ksi (from ASME B31.3)
}
