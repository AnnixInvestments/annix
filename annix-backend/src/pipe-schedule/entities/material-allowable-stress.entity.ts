import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('material_allowable_stresses')
@Unique(['materialCode', 'temperatureCelsius'])
export class MaterialAllowableStress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'material_code', type: 'varchar', length: 50 })
  materialCode: string; // e.g., "ASTM_A106_Grade_B", "ASTM_A53_Grade_B", "ASTM_A312_TP304"

  @Column({ name: 'material_name', type: 'varchar', length: 100 })
  materialName: string; // Human readable name

  @Column({ name: 'temperature_celsius', type: 'decimal', precision: 8, scale: 2 })
  temperatureCelsius: number;

  @Column({ name: 'temperature_fahrenheit', type: 'decimal', precision: 8, scale: 2 })
  temperatureFahrenheit: number;

  @Column({ name: 'allowable_stress_ksi', type: 'decimal', precision: 8, scale: 2 })
  allowableStressKsi: number; // Allowable stress in ksi (1000 psi)

  @Column({ name: 'allowable_stress_mpa', type: 'decimal', precision: 8, scale: 2 })
  allowableStressMpa: number; // Allowable stress in MPa

  @Column({ name: 'source_standard', type: 'varchar', length: 50, default: 'ASME B31.3' })
  sourceStandard: string; // Source standard for the stress values
}
