import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";

@Entity("sm_consumable_product")
export class ConsumableProduct {
  @PrimaryColumn({ name: "product_id", type: "integer" })
  productId: number;

  @OneToOne(
    () => IssuableProduct,
    (product) => product.consumable,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;
}
