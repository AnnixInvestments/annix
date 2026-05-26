import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ProductCodingType, RubberProductCoding } from "../entities/rubber-product-coding.entity";

export abstract class RubberProductCodingRepository extends CrudRepository<RubberProductCoding> {
  abstract build(data: Partial<RubberProductCoding>): RubberProductCoding;
  abstract deleteById(id: number): Promise<boolean>;
  abstract countNeedingReview(): Promise<number>;
  abstract findOrderedByType(codingType?: ProductCodingType): Promise<RubberProductCoding[]>;
  abstract findByType(codingType: ProductCodingType): Promise<RubberProductCoding[]>;
  abstract findManyByCodesAndType(
    codes: string[],
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding[]>;
  abstract findManyByFirebaseUids(firebaseUids: string[]): Promise<RubberProductCoding[]>;
  abstract findOneById(id: number): Promise<RubberProductCoding | null>;
  abstract findOneByIdAndType(
    id: number,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null>;
  abstract findOneByCodeAndType(
    code: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null>;
  abstract findOneByAliasAndType(
    alias: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null>;
  abstract findOneByCodeOrAliasAndType(
    code: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null>;
  abstract findOneByCodeLike(codeFragment: string): Promise<RubberProductCoding | null>;
}
