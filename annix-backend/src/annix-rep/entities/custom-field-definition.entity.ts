import { User } from "../../user/entities/user.entity";

export enum CustomFieldType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  SELECT = "select",
  MULTISELECT = "multiselect",
  BOOLEAN = "boolean",
}

export class CustomFieldDefinition {
  id: number;

  user: User;

  userId: number;

  name: string;

  fieldKey: string;

  fieldType: CustomFieldType;

  isRequired: boolean;

  options: string[] | null;

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
