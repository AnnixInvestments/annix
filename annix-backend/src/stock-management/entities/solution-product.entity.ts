import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_solution_product")
export class SolutionProduct {
  @PrimaryColumn({ name: "product_id", type: "integer" })
  productId: number;

  @OneToOne(
    () => IssuableProduct,
    (product) => product.solution,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "active_ingredient", type: "varchar", length: 255, nullable: true })
  activeIngredient: string | null;

  @Column({
    name: "concentration_pct",
    type: "numeric",
    precision: 6,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  concentrationPct: number | null;

  @Column({
    name: "density_kg_per_l",
    type: "numeric",
    precision: 8,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  densityKgPerL: number | null;

  @Column({ name: "hazard_classification", type: "varchar", length: 64, nullable: true })
  hazardClassification: string | null;

  @Column({ name: "storage_requirement", type: "text", nullable: true })
  storageRequirement: string | null;

  @Column({ name: "shelf_life_months", type: "integer", nullable: true })
  shelfLifeMonths: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;
}
