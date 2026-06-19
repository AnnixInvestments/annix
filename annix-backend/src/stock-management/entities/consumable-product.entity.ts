import { IssuableProduct } from "./issuable-product.entity";

export class ConsumableProduct {
  productId: number;

  product: IssuableProduct;

  notes: string | null;

  get id(): number {
    return this.productId;
  }

  set id(value: number) {
    this.productId = value;
  }
}
