import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaintReturnDocument = HydratedDocument<PaintReturn>;

@Schema({
  collection: "sm_paint_return",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaintReturn {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  returnSessionId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  sourceIssuanceRowId: number;

  @Prop({ type: Number, required: false })
  sourceProductId: number;

  @Prop({ type: Number, required: true })
  litresReturned: number;

  @Prop({ type: String, required: true })
  condition: string;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const PaintReturnSchema = SchemaFactory.createForClass(PaintReturn);

PaintReturnSchema.virtual("returnSession", {
  ref: "ReturnSession",
  localField: "returnSessionId",
  foreignField: "_id",
  justOne: true,
});
