import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberStockLocationDocument = HydratedDocument<RubberStockLocation>;

@Schema({
  collection: "rubber_stock_locations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberStockLocation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberStockLocationSchema = SchemaFactory.createForClass(RubberStockLocation);
