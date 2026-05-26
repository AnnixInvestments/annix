import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CommodityDocument = HydratedDocument<Commodity>;

@Schema({
  collection: "commodities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Commodity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  commodityName: string;

  @Prop({ type: String, required: false })
  typicalProcessRoute: string;

  @Prop({ type: String, required: false })
  applicationNotes: string;
}

export const CommoditySchema = SchemaFactory.createForClass(Commodity);

CommoditySchema.virtual("mines", {
  ref: "SaMine",
  localField: "_id",
  foreignField: "commodityId",
  justOne: false,
});

CommoditySchema.virtual("slurryProfiles", {
  ref: "SlurryProfile",
  localField: "_id",
  foreignField: "commodityId",
  justOne: false,
});
