import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangeStandardDocument = HydratedDocument<FlangeStandard>;

@Schema({
  collection: "flange_standards",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangeStandard {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;
}

export const FlangeStandardSchema = SchemaFactory.createForClass(FlangeStandard);

FlangeStandardSchema.virtual("flanges", {
  ref: "FlangeDimension",
  localField: "_id",
  foreignField: "standardId",
  justOne: false,
});
