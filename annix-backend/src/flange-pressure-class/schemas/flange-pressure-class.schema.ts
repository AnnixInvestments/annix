import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangePressureClassDocument = HydratedDocument<FlangePressureClass>;

@Schema({
  collection: "flange_pressure_classes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangePressureClass {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  designation: string;

  @Prop({ type: String, required: false })
  pressureCategory: string;

  @Prop({ type: Number, required: false })
  standardId: number;
}

export const FlangePressureClassSchema = SchemaFactory.createForClass(FlangePressureClass);

FlangePressureClassSchema.virtual("standard", {
  ref: "FlangeStandard",
  localField: "standardId",
  foreignField: "_id",
  justOne: true,
});

FlangePressureClassSchema.virtual("flanges", {
  ref: "FlangeDimension",
  localField: "_id",
  foreignField: "pressureClassId",
  justOne: false,
});
