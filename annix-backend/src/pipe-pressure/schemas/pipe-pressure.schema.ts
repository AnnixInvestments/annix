import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipePressureDocument = HydratedDocument<PipePressure>;

@Schema({
  collection: "pipe_pressures",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipePressure {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  temperature_c: number;

  @Prop({ type: Number, required: false })
  max_working_pressure_mpa: number;

  @Prop({ type: Number, required: true })
  allowable_stress_mpa: number;

  @Prop({ type: Number, required: false })
  pipeDimensionId: number;
}

export const PipePressureSchema = SchemaFactory.createForClass(PipePressure);

PipePressureSchema.virtual("pipeDimension", {
  ref: "PipeDimension",
  localField: "pipeDimensionId",
  foreignField: "_id",
  justOne: true,
});
