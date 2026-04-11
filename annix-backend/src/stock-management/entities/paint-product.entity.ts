import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";

export type PaintCoatType = "primer" | "intermediate" | "finish" | "sealer" | "banding";
export type PaintSystem = "epoxy" | "polyurethane" | "alkyd" | "zinc_rich" | "acrylic" | "other";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_paint_product")
export class PaintProduct {
  @PrimaryColumn({ name: "product_id", type: "integer" })
  productId: number;

  @OneToOne(
    () => IssuableProduct,
    (product) => product.paint,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({
    name: "coverage_m2_per_litre",
    type: "numeric",
    precision: 8,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  coverageM2PerLitre: number | null;

  @Column({ name: "wet_film_thickness_um", type: "integer", nullable: true })
  wetFilmThicknessUm: number | null;

  @Column({ name: "dry_film_thickness_um", type: "integer", nullable: true })
  dryFilmThicknessUm: number | null;

  @Column({ name: "coat_type", type: "varchar", length: 32, nullable: true })
  coatType: PaintCoatType | null;

  @Column({ name: "paint_system", type: "varchar", length: 32, nullable: true })
  paintSystem: PaintSystem | null;

  @Column({ name: "number_of_parts", type: "integer", nullable: true })
  numberOfParts: number | null;

  @Column({ name: "mixing_ratio", type: "varchar", length: 32, nullable: true })
  mixingRatio: string | null;

  @Column({ name: "pot_life_minutes", type: "integer", nullable: true })
  potLifeMinutes: number | null;

  @Column({ name: "is_banding", type: "boolean", default: false })
  isBanding: boolean;

  @Column({ name: "supplier_product_code", type: "varchar", length: 64, nullable: true })
  supplierProductCode: string | null;

  @Column({ name: "colour_code", type: "varchar", length: 64, nullable: true })
  colourCode: string | null;

  @Column({ name: "gloss_level", type: "varchar", length: 32, nullable: true })
  glossLevel: string | null;

  @Column({
    name: "voc_content_g_per_l",
    type: "numeric",
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  vocContentGPerL: number | null;

  @Column({
    name: "density_kg_per_l",
    type: "numeric",
    precision: 8,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  densityKgPerL: number | null;

  @Column({ name: "datasheet_url", type: "text", nullable: true })
  datasheetUrl: string | null;

  @Column({ name: "msds_url", type: "text", nullable: true })
  msdsUrl: string | null;

  @Column({ name: "thinner_reference", type: "varchar", length: 64, nullable: true })
  thinnerReference: string | null;

  @Column({ name: "shelf_life_months", type: "integer", nullable: true })
  shelfLifeMonths: number | null;

  @Column({ name: "surface_prep_requirement", type: "varchar", length: 64, nullable: true })
  surfacePrepRequirement: string | null;

  @Column({
    name: "min_application_temp_c",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  minApplicationTempC: number | null;

  @Column({
    name: "max_application_temp_c",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  maxApplicationTempC: number | null;

  @Column({ name: "substrate_compatibility", type: "text", array: true, nullable: true })
  substrateCompatibility: string[] | null;
}
