import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberPoExtractionTemplate } from "./rubber-po-extraction-template.entity";

export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

@Entity("rubber_po_extraction_region")
export class RubberPoExtractionRegion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "template_id", type: "int" })
  templateId: number;

  @ManyToOne(
    () => RubberPoExtractionTemplate,
    (template) => template.regions,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "template_id" })
  template: RubberPoExtractionTemplate;

  @Column({ name: "field_name", type: "varchar", length: 50 })
  fieldName: string;

  @Column({ name: "region_coordinates", type: "jsonb" })
  regionCoordinates: RegionCoordinates;

  @Column({ name: "label_coordinates", type: "jsonb", nullable: true })
  labelCoordinates: RegionCoordinates | null;

  @Column({ name: "label_text", type: "varchar", length: 255, nullable: true })
  labelText: string | null;

  @Column({ name: "extraction_pattern", type: "varchar", length: 500, nullable: true })
  extractionPattern: string | null;

  @Column({ name: "sample_value", type: "varchar", length: 500, nullable: true })
  sampleValue: string | null;

  @Column({ name: "confidence_threshold", type: "float", default: 0.7 })
  confidenceThreshold: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
