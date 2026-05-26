import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { ProductCodingType, RubberProductCoding } from "../entities/rubber-product-coding.entity";
import { RubberProductCodingRepository } from "./rubber-product-coding.repository";

@Injectable()
export class PostgresRubberProductCodingRepository
  extends TypeOrmCrudRepository<RubberProductCoding>
  implements RubberProductCodingRepository
{
  constructor(@InjectRepository(RubberProductCoding) repository: Repository<RubberProductCoding>) {
    super(repository);
  }

  build(data: Partial<RubberProductCoding>): RubberProductCoding {
    return this.repository.create(data as TypeOrmDeepPartial<RubberProductCoding>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  countNeedingReview(): Promise<number> {
    return this.repository.count({ where: { needsReview: true } });
  }

  findOrderedByType(codingType?: ProductCodingType): Promise<RubberProductCoding[]> {
    const where = codingType ? { codingType } : {};
    return this.repository.find({
      where,
      order: { codingType: "ASC", code: "ASC" },
    });
  }

  findByType(codingType: ProductCodingType): Promise<RubberProductCoding[]> {
    return this.repository.find({ where: { codingType } });
  }

  findManyByCodesAndType(
    codes: string[],
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding[]> {
    return this.repository.find({
      where: { code: In(codes), codingType },
    });
  }

  findManyByFirebaseUids(firebaseUids: string[]): Promise<RubberProductCoding[]> {
    return this.repository.find({
      where: { firebaseUid: In(firebaseUids) },
    });
  }

  findOneById(id: number): Promise<RubberProductCoding | null> {
    return this.repository.findOne({ where: { id } });
  }

  findOneByIdAndType(
    id: number,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    return this.repository.findOne({ where: { id, codingType } });
  }

  findOneByCodeAndType(
    code: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    return this.repository.findOne({ where: { code, codingType } });
  }

  findOneByAliasAndType(
    alias: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    return this.repository
      .createQueryBuilder("pc")
      .where("pc.coding_type = :type", { type: codingType })
      .andWhere("pc.aliases @> :aliasJson::jsonb", { aliasJson: JSON.stringify([alias]) })
      .getOne();
  }

  findOneByCodeOrAliasAndType(
    code: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    return this.repository
      .createQueryBuilder("pc")
      .where("pc.coding_type = :type", { type: codingType })
      .andWhere("(pc.code = :code OR pc.aliases @> :codeJson::jsonb)", {
        code,
        codeJson: JSON.stringify([code]),
      })
      .getOne();
  }

  findOneByCodeLike(codeFragment: string): Promise<RubberProductCoding | null> {
    return this.repository.findOne({
      where: { code: ILike(`%${codeFragment}%`) },
    });
  }
}
