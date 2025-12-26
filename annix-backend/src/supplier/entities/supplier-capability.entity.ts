import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierProfile } from './supplier-profile.entity';

export enum ProductCategory {
  STRAIGHT_PIPE = 'straight_pipe',
  BENDS = 'bends',
  FLANGES = 'flanges',
  FITTINGS = 'fittings',
  VALVES = 'valves',
  STRUCTURAL_STEEL = 'structural_steel',
  HDPE = 'hdpe',
  PVC = 'pvc',
  FABRICATION = 'fabrication',
  COATING = 'coating',
  INSPECTION = 'inspection',
  OTHER = 'other',
}

export enum MaterialSpecialization {
  CARBON_STEEL = 'carbon_steel',
  STAINLESS_STEEL = 'stainless_steel',
  ALLOY_STEEL = 'alloy_steel',
  HDPE = 'hdpe',
  PVC = 'pvc',
  RUBBER = 'rubber',
  OTHER = 'other',
}

export enum CertificationLevel {
  ISO_9001 = 'iso_9001',
  ISO_14001 = 'iso_14001',
  ISO_45001 = 'iso_45001',
  ASME = 'asme',
  API = 'api',
  SABS = 'sabs',
  CE_MARKED = 'ce_marked',
  NONE = 'none',
}

@Entity('supplier_capabilities')
export class SupplierCapability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_profile_id' })
  supplierProfileId: number;

  @ManyToOne(() => SupplierProfile, (profile) => profile.capabilities)
  @JoinColumn({ name: 'supplier_profile_id' })
  supplierProfile: SupplierProfile;

  // Product/Service Category
  @Column({
    type: 'enum',
    enum: ProductCategory,
    name: 'product_category',
  })
  productCategory: ProductCategory;

  // Material Specializations
  @Column({
    type: 'enum',
    enum: MaterialSpecialization,
    array: true,
    name: 'material_specializations',
    default: '{}',
  })
  materialSpecializations: MaterialSpecialization[];

  // Capacity and Capabilities
  @Column({ type: 'integer', nullable: true, name: 'monthly_capacity_tons' })
  monthlyCapacityTons: number;

  @Column({ type: 'text', nullable: true, name: 'size_range_description' })
  sizeRangeDescription: string; // e.g., "DN15 - DN600", "6\" - 48\""

  @Column({ type: 'text', nullable: true, name: 'pressure_ratings' })
  pressureRatings: string; // e.g., "PN10 - PN40", "150# - 600#"

  // Geographic Coverage
  @Column({
    type: 'text',
    array: true,
    name: 'operational_regions',
    default: '{}',
  })
  operationalRegions: string[]; // e.g., ["Gauteng", "Western Cape", "KZN"]

  @Column({ type: 'boolean', name: 'nationwide_coverage', default: false })
  nationwideCoverage: boolean;

  @Column({ type: 'boolean', name: 'international_supply', default: false })
  internationalSupply: boolean;

  // Certifications
  @Column({
    type: 'enum',
    enum: CertificationLevel,
    array: true,
    name: 'certifications',
    default: '{}',
  })
  certifications: CertificationLevel[];

  @Column({ type: 'date', nullable: true, name: 'certification_expiry_date' })
  certificationExpiryDate: Date;

  // Lead Times
  @Column({ type: 'integer', nullable: true, name: 'standard_lead_time_days' })
  standardLeadTimeDays: number;

  @Column({ type: 'integer', nullable: true, name: 'expedited_lead_time_days' })
  expeditedLeadTimeDays: number;

  // Minimum Order
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'minimum_order_value' })
  minimumOrderValue: number;

  @Column({ type: 'text', nullable: true, name: 'minimum_order_quantity' })
  minimumOrderQuantity: string;

  // Quality and Compliance
  @Column({ type: 'boolean', name: 'mill_test_certificates', default: false })
  millTestCertificates: boolean;

  @Column({ type: 'boolean', name: 'third_party_inspection', default: false })
  thirdPartyInspection: boolean;

  @Column({ type: 'text', nullable: true, name: 'quality_documentation' })
  qualityDocumentation: string;

  // Additional Details
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  // Capability Score (for FR-P8)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'capability_score' })
  capabilityScore: number; // 0-100 score based on completeness, certifications, performance

  @Column({ type: 'timestamp', nullable: true, name: 'last_verified_at' })
  lastVerifiedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
