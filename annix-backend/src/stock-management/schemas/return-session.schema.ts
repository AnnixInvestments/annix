import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReturnSessionDocument = HydratedDocument<ReturnSession>;

@Schema({
  collection: "sm_return_session",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ReturnSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  returnKind: string;

  @Prop({ type: Number, required: false })
  targetIssuanceRowId: number;

  @Prop({ type: Number, required: false })
  targetSessionId: number;

  @Prop({ type: Number, required: false })
  targetJobCardId: number;

  @Prop({ type: Number, required: false })
  returnedByStaffId: number;

  @Prop({ type: Number, required: false })
  confirmedByStaffId: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ReturnSessionSchema = SchemaFactory.createForClass(ReturnSession);

ReturnSessionSchema.virtual("offcutReturns", {
  ref: "RubberOffcutReturn",
  localField: "_id",
  foreignField: "returnSessionId",
  justOne: false,
});

ReturnSessionSchema.virtual("paintReturns", {
  ref: "PaintReturn",
  localField: "_id",
  foreignField: "returnSessionId",
  justOne: false,
});

ReturnSessionSchema.virtual("consumableReturns", {
  ref: "ConsumableReturn",
  localField: "_id",
  foreignField: "returnSessionId",
  justOne: false,
});
