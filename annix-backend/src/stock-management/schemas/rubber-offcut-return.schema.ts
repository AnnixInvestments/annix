import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberOffcutReturnDocument = HydratedDocument<RubberOffcutReturn>;

@Schema({
  collection: "sm_rubber_offcut_return",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberOffcutReturn {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  returnSessionId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  sourceIssuanceRowId: number;

  @Prop({ type: Number, required: false })
  sourceRubberRollId: number;

  @Prop({ type: String, required: false })
  offcutNumber: string;

  @Prop({ type: Number, required: true })
  widthMm: number;

  @Prop({ type: Number, required: true })
  lengthM: number;

  @Prop({ type: Number, required: true })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  computedWeightKg: number;

  @Prop({ type: Number, required: false })
  compoundId: number;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: String, required: false })
  colour: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Number, required: false })
  createsOffcutProductId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const RubberOffcutReturnSchema = SchemaFactory.createForClass(RubberOffcutReturn);

RubberOffcutReturnSchema.virtual("returnSession", {
  ref: "ReturnSession",
  localField: "returnSessionId",
  foreignField: "_id",
  justOne: true,
});
