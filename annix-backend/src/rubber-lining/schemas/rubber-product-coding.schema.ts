import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberProductCodingDocument = HydratedDocument<RubberProductCoding>;

@Schema({
  collection: "rubber_product_coding",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberProductCoding {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  codingType: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Object, required: true })
  aliases: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  needsReview: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberProductCodingSchema = SchemaFactory.createForClass(RubberProductCoding);
