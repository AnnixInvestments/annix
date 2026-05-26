import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangeBoltingDocument = HydratedDocument<FlangeBolting>;

@Schema({
  collection: "flange_bolting",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangeBolting {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  standardId: number;

  @Prop({ type: String, required: true })
  pressureClass: string;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: true })
  numBolts: number;

  @Prop({ type: Number, required: true })
  boltDia: number;

  @Prop({ type: Number, required: false })
  boltLengthDefault: number;

  @Prop({ type: Number, required: false })
  boltLengthSoSwTh: number;

  @Prop({ type: Number, required: false })
  boltLengthLj: number;

  @Prop({ type: Number, required: false })
  boltLengthRf: number;

  @Prop({ type: Number, required: false })
  boltLengthBl: number;
}

export const FlangeBoltingSchema = SchemaFactory.createForClass(FlangeBolting);

FlangeBoltingSchema.virtual("standard", {
  ref: "FlangeStandard",
  localField: "standardId",
  foreignField: "_id",
  justOne: true,
});
