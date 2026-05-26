import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppDocument = HydratedDocument<App>;

@Schema({
  collection: "apps",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class App {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  icon: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AppSchema = SchemaFactory.createForClass(App);

AppSchema.virtual("permissions", {
  ref: "AppPermission",
  localField: "_id",
  foreignField: "appId",
  justOne: false,
});

AppSchema.virtual("roles", {
  ref: "AppRole",
  localField: "_id",
  foreignField: "appId",
  justOne: false,
});

AppSchema.virtual("userAccess", {
  ref: "UserAppAccess",
  localField: "_id",
  foreignField: "appId",
  justOne: false,
});
