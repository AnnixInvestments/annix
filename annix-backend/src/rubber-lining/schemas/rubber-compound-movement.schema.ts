import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompoundMovementDocument = HydratedDocument<RubberCompoundMovement>;

@Schema({
  collection: "rubber_compound_movements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompoundMovement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  compoundStockId: number;

  @Prop({ type: String, required: true })
  movementType: string;

  @Prop({ type: Number, required: true })
  quantityKg: number;

  @Prop({ type: String, required: true })
  referenceType: string;

  @Prop({ type: Number, required: false })
  referenceId: number;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  movementDate: Date;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const RubberCompoundMovementSchema = SchemaFactory.createForClass(RubberCompoundMovement);

RubberCompoundMovementSchema.virtual("compoundStock", {
  ref: "RubberCompoundStock",
  localField: "compoundStockId",
  foreignField: "_id",
  justOne: true,
});
