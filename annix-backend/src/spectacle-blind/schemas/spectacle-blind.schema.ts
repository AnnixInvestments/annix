import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SpectacleBlindDocument = HydratedDocument<SpectacleBlind>;

@Schema({
  collection: "spectacle_blinds",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SpectacleBlind {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: String, required: true })
  pressureClass: string;

  @Prop({ type: Number, required: true })
  odBlind: number;

  @Prop({ type: Number, required: true })
  odSpacer: number;

  @Prop({ type: Number, required: true })
  thicknessBlind: number;

  @Prop({ type: Number, required: true })
  thicknessSpacer: number;

  @Prop({ type: Number, required: true })
  barWidth: number;

  @Prop({ type: Number, required: true })
  barThickness: number;

  @Prop({ type: Number, required: true })
  overallLength: number;

  @Prop({ type: Number, required: false })
  handleLength: number;

  @Prop({ type: Number, required: false })
  weightKg: number;
}

export const SpectacleBlindSchema = SchemaFactory.createForClass(SpectacleBlind);
