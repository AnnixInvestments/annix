import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ChemicalCompositionDocument = HydratedDocument<ChemicalComposition>;

@Schema({
  collection: "chemical_compositions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ChemicalComposition {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  carbonPct: number;

  @Prop({ type: Number, required: false })
  manganesePct: number;

  @Prop({ type: Number, required: false })
  phosphorusPct: number;

  @Prop({ type: Number, required: false })
  sulfurPct: number;

  @Prop({ type: Number, required: false })
  siliconPct: number;

  @Prop({ type: Number, required: false })
  chromiumPct: number;

  @Prop({ type: Number, required: false })
  molybdenumPct: number;

  @Prop({ type: Number, required: false })
  nickelPct: number;

  @Prop({ type: Number, required: false })
  vanadiumPct: number;

  @Prop({ type: Number, required: false })
  copperPct: number;

  @Prop({ type: Number, required: false })
  niobiumPct: number;

  @Prop({ type: Number, required: false })
  titaniumPct: number;

  @Prop({ type: Number, required: false })
  aluminumPct: number;

  @Prop({ type: Number, required: false })
  nitrogenPct: number;

  @Prop({ type: Number, required: false })
  boronPct: number;

  @Prop({ type: String, required: false })
  heatNumber: string;

  @Prop({ type: String, required: false })
  mtcReference: string;

  @Prop({ type: Number, required: false })
  rfqItemId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ChemicalCompositionSchema = SchemaFactory.createForClass(ChemicalComposition);

ChemicalCompositionSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
