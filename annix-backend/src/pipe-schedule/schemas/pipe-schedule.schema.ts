import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeScheduleDocument = HydratedDocument<PipeSchedule>;

@Schema({
  collection: "pipe_schedules",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeSchedule {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: false })
  nbMm: number;

  @Prop({ type: String, required: true })
  schedule: string;

  @Prop({ type: Number, required: true })
  wallThicknessInch: number;

  @Prop({ type: Number, required: true })
  wallThicknessMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterInch: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: String, required: true })
  standardCode: string;
}

export const PipeScheduleSchema = SchemaFactory.createForClass(PipeSchedule);
