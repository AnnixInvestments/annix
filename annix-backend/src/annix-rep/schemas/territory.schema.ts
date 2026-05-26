import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TerritoryDocument = HydratedDocument<Territory>;

@Schema({
  collection: "annix_rep_territories",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Territory {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  organizationId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: [String], required: false })
  provinces: string;

  @Prop({ type: [String], required: false })
  cities: string;

  @Prop({ type: Object, required: false })
  bounds: Record<string, unknown>;

  @Prop({ type: String, required: false })
  assignedToId: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const TerritorySchema = SchemaFactory.createForClass(Territory);

TerritorySchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

TerritorySchema.virtual("assignedTo", {
  ref: "User",
  localField: "assignedToId",
  foreignField: "_id",
  justOne: true,
});
