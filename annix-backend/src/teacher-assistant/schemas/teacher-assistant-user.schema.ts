import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TeacherAssistantUserDocument = HydratedDocument<TeacherAssistantUser>;

@Schema({
  collection: "teacher_assistant_users",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TeacherAssistantUser {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  schoolName: string;

  @Prop({ type: Number, required: false })
  userId: number | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const TeacherAssistantUserSchema = SchemaFactory.createForClass(TeacherAssistantUser);
