import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ProductCategoryDocument = HydratedDocument<ProductCategory>;

@Schema({
  collection: "sm_product_category",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ProductCategory {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  productType: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: String, required: false })
  iconKey: string;

  @Prop({ type: Object, required: true })
  workflowHints: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory);
