import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RollStockStatus, RubberRollStock } from "../entities/rubber-roll-stock.entity";
import {
  type RollStockListFilters,
  RubberRollStockRepository,
} from "./rubber-roll-stock.repository";

const ROLL_RELATIONS = ["compoundCoding", "soldToCompany"];

@Injectable()
export class PostgresRubberRollStockRepository
  extends TypeOrmCrudRepository<RubberRollStock>
  implements RubberRollStockRepository
{
  constructor(@InjectRepository(RubberRollStock) repository: Repository<RubberRollStock>) {
    super(repository);
  }

  build(data: Partial<RubberRollStock>): RubberRollStock {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRollStock>);
  }

  saveMany(entities: RubberRollStock[]): Promise<RubberRollStock[]> {
    return this.repository.save(entities);
  }

  async removeMany(entities: RubberRollStock[]): Promise<void> {
    await this.repository.remove(entities);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }

  inStockCount(): Promise<number> {
    return this.repository.count({ where: { status: RollStockStatus.IN_STOCK } });
  }

  reservedCount(): Promise<number> {
    return this.repository.count({ where: { status: RollStockStatus.RESERVED } });
  }

  findFilteredWithRelations(filters?: RollStockListFilters): Promise<RubberRollStock[]> {
    const query = this.repository
      .createQueryBuilder("roll")
      .leftJoinAndSelect("roll.compoundCoding", "coding")
      .leftJoinAndSelect("roll.soldToCompany", "soldToCompany")
      .orderBy("roll.created_at", "DESC");

    if (filters?.status) {
      query.andWhere("roll.status = :status", { status: filters.status });
    }
    if (filters?.compoundCodingId) {
      query.andWhere("roll.compound_coding_id = :codingId", {
        codingId: filters.compoundCodingId,
      });
    }
    if (filters?.soldToCompanyId) {
      query.andWhere("roll.sold_to_company_id = :companyId", {
        companyId: filters.soldToCompanyId,
      });
    }

    return query.getMany();
  }

  findOneByIdWithRelations(id: number): Promise<RubberRollStock | null> {
    return this.repository.findOne({ where: { id }, relations: ROLL_RELATIONS });
  }

  findOneByRollNumberWithRelations(rollNumber: string): Promise<RubberRollStock | null> {
    return this.repository.findOne({ where: { rollNumber }, relations: ROLL_RELATIONS });
  }

  findOneByRollNumber(rollNumber: string): Promise<RubberRollStock | null> {
    return this.repository.findOne({ where: { rollNumber } });
  }

  findOneByRollNumberWithCoding(rollNumber: string): Promise<RubberRollStock | null> {
    return this.repository.findOne({
      where: { rollNumber },
      relations: ["compoundCoding"],
    });
  }

  findOneByRollNumberSuffixWithCoding(rollNumber: string): Promise<RubberRollStock | null> {
    return this.repository.findOne({
      where: { rollNumber: ILike(`%-${rollNumber}`) },
      relations: ["compoundCoding"],
    });
  }

  findOneByRollNumberLikeWithCoding(rollNumberFragment: string): Promise<RubberRollStock | null> {
    return this.repository.findOne({
      where: { rollNumber: ILike(`%${rollNumberFragment}%`) },
      relations: ["compoundCoding"],
    });
  }

  findOneByAttributesWithCoding(
    compoundCodingId: number,
    weightKg: number,
    status: RollStockStatus,
  ): Promise<RubberRollStock | null> {
    return this.repository.findOne({
      where: { compoundCodingId, weightKg, status },
      relations: ["compoundCoding"],
    });
  }

  findManyByRollNumbers(rollNumbers: string[]): Promise<RubberRollStock[]> {
    return this.repository.find({ where: { rollNumber: In(rollNumbers) } });
  }

  findManyByRollNumbersWithRelations(rollNumbers: string[]): Promise<RubberRollStock[]> {
    return this.repository.find({
      where: { rollNumber: In(rollNumbers) },
      relations: ROLL_RELATIONS,
    });
  }

  findManyByIdsWithCoding(ids: number[]): Promise<RubberRollStock[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations: ["compoundCoding"],
    });
  }

  findManyByCustomerTaxInvoiceId(customerTaxInvoiceId: number): Promise<RubberRollStock[]> {
    return this.repository.find({ where: { customerTaxInvoiceId } });
  }

  findManyByCustomerDeliveryNoteId(customerDeliveryNoteId: number): Promise<RubberRollStock[]> {
    return this.repository.find({ where: { customerDeliveryNoteId } });
  }

  findManyBySupplierDeliveryNoteId(supplierDeliveryNoteId: number): Promise<RubberRollStock[]> {
    return this.repository.find({ where: { supplierDeliveryNoteId } });
  }

  findManyBySupplierTaxInvoiceId(supplierTaxInvoiceId: number): Promise<RubberRollStock[]> {
    return this.repository.find({ where: { supplierTaxInvoiceId } });
  }

  findManyByCompoundCodingIdAndStatusOrdered(
    compoundCodingId: number,
    status: RollStockStatus,
  ): Promise<RubberRollStock[]> {
    return this.repository.find({
      where: { compoundCodingId, status },
      relations: ROLL_RELATIONS,
      order: { rollNumber: "ASC" },
    });
  }

  async setAuCocIdForRollIds(rollIds: number[], auCocId: number): Promise<void> {
    await this.repository.update({ id: In(rollIds) }, { auCocId });
  }

  async clearAuCocId(auCocId: number): Promise<void> {
    await this.repository.update({ auCocId }, { auCocId: null });
  }

  findOneByIdWithCoding(id: number): Promise<RubberRollStock | null> {
    return this.repository
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.compoundCoding", "cc")
      .where("r.id = :id", { id })
      .getOne();
  }

  findAllWithCodingByStatusOrdered(status?: string): Promise<RubberRollStock[]> {
    const query = this.repository
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.compoundCoding", "cc");

    if (status) {
      query.andWhere("r.status = :status", { status });
    }

    query.orderBy("r.rollNumber", "ASC");

    return query.getMany();
  }
}
