import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RubberType } from './rubber-type.entity';

export enum ApplicationEnvironment {
  MINING_SLURRY = 'mining_slurry',
  CHEMICAL_PROCESSING = 'chemical_processing',
  WATER_TREATMENT = 'water_treatment',
  OIL_AND_GAS = 'oil_and_gas',
  FOOD_PROCESSING = 'food_processing',
  GENERAL_INDUSTRIAL = 'general_industrial',
}

export enum ChemicalCategory {
  ACIDS_INORGANIC = 'acids_inorganic',
  ACIDS_ORGANIC = 'acids_organic',
  ALKALIS = 'alkalis',
  ALCOHOLS = 'alcohols',
  HYDROCARBONS = 'hydrocarbons',
  OILS_MINERAL = 'oils_mineral',
  OILS_VEGETABLE = 'oils_vegetable',
  CHLORINE_COMPOUNDS = 'chlorine_compounds',
  OXIDIZING_AGENTS = 'oxidizing_agents',
  SOLVENTS = 'solvents',
  WATER = 'water',
  SLURRY_ABRASIVE = 'slurry_abrasive',
}

export enum ResistanceRating {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  NOT_RECOMMENDED = 'not_recommended',
}

@Entity('rubber_application_ratings')
export class RubberApplicationRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rubber_type_id', type: 'int' })
  rubberTypeId: number;

  @ManyToOne(() => RubberType)
  @JoinColumn({ name: 'rubber_type_id' })
  rubberType: RubberType;

  @Column({
    name: 'chemical_category',
    type: 'varchar',
    length: 50,
  })
  chemicalCategory: string;

  @Column({
    name: 'resistance_rating',
    type: 'varchar',
    length: 50,
  })
  resistanceRating: string;

  @Column({
    name: 'max_temp_celsius',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
  })
  maxTempCelsius: number | null;

  @Column({
    name: 'max_concentration_percent',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
  })
  maxConcentrationPercent: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}

@Entity('rubber_thickness_recommendations')
export class RubberThicknessRecommendation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'nominal_thickness_mm',
    type: 'decimal',
    precision: 4,
    scale: 1,
  })
  nominalThicknessMm: number;

  @Column({ name: 'min_plies', type: 'int' })
  minPlies: number;

  @Column({
    name: 'max_ply_thickness_mm',
    type: 'decimal',
    precision: 3,
    scale: 1,
  })
  maxPlyThicknessMm: number;

  @Column({ name: 'application_notes', type: 'text', nullable: true })
  applicationNotes: string | null;

  @Column({
    name: 'suitable_for_complex_shapes',
    type: 'boolean',
    default: true,
  })
  suitableForComplexShapes: boolean;
}

@Entity('rubber_adhesion_requirements')
export class RubberAdhesionRequirement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rubber_type_id', type: 'int' })
  rubberTypeId: number;

  @ManyToOne(() => RubberType)
  @JoinColumn({ name: 'rubber_type_id' })
  rubberType: RubberType;

  @Column({
    name: 'vulcanization_method',
    type: 'varchar',
    length: 50,
  })
  vulcanizationMethod: string;

  @Column({
    name: 'min_adhesion_n_per_mm',
    type: 'decimal',
    precision: 4,
    scale: 1,
  })
  minAdhesionNPerMm: number;

  @Column({ name: 'test_standard', type: 'varchar', length: 50 })
  testStandard: string;
}
