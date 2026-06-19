export enum ProductCodingType {
  COLOUR = "COLOUR",
  COMPOUND = "COMPOUND",
  CURING_METHOD = "CURING_METHOD",
  GRADE = "GRADE",
  HARDNESS = "HARDNESS",
  TYPE = "TYPE",
}

export class RubberProductCoding {
  id: number;

  firebaseUid: string;

  codingType: ProductCodingType;

  code: string;

  name: string;

  aliases: string[];

  needsReview: boolean;

  createdAt: Date;

  updatedAt: Date;
}
