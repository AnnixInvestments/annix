import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeScheduleWallDocument = HydratedDocument<PipeScheduleWall>;

@Schema({
  collection: "pipe_schedule_walls",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeScheduleWall {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: String, required: true })
  schedule: string;

  @Prop({ type: Number, required: true })
  wallThicknessInch: number;

  @Prop({ type: Number, required: true })
  wallThicknessMm: number;
}

export const PipeScheduleWallSchema = SchemaFactory.createForClass(PipeScheduleWall);
