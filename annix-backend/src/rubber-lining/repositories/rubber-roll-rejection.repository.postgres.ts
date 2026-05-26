import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RollRejectionStatus, RubberRollRejection } from "../entities/rubber-roll-rejection.entity";
import { RubberRollRejectionRepository } from "./rubber-roll-rejection.repository";

@Injectable()
export class PostgresRubberRollRejectionRepository
  extends TypeOrmCrudRepository<RubberRollRejection>
  implements RubberRollRejectionRepository
{
  constructor(@InjectRepository(RubberRollRejection) repository: Repository<RubberRollRejection>) {
    super(repository);
  }

  build(data: Partial<RubberRollRejection>): RubberRollRejection {
    return this.repository.create(data as TypeOrmDeepPartial<RubberRollRejection>);
  }

  findByIdWithCocs(id: number): Promise<RubberRollRejection | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
    });
  }

  findBySupplierCocOrdered(supplierCocId: number): Promise<RubberRollRejection[]> {
    return this.repository.find({
      where: { originalSupplierCocId: supplierCocId },
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
      order: { createdAt: "DESC" },
    });
  }

  findRollNumbersBySupplierCoc(supplierCocId: number): Promise<RubberRollRejection[]> {
    return this.repository.find({
      where: { originalSupplierCocId: supplierCocId },
      select: ["rollNumber"],
    });
  }

  findAllRejectionRefs(): Promise<RubberRollRejection[]> {
    return this.repository.find({
      select: ["originalSupplierCocId", "rollNumber", "replacementSupplierCocId"],
    });
  }

  findAllOrdered(statusFilter?: RollRejectionStatus): Promise<RubberRollRejection[]> {
    const where: Record<string, unknown> = {};
    if (statusFilter) {
      where.status = statusFilter;
    }
    return this.repository.find({
      where,
      relations: ["originalSupplierCoc", "replacementSupplierCoc"],
      order: { createdAt: "DESC" },
    });
  }

  async findRefsByCocIds(cocIds: number[]): Promise<RubberRollRejection[]> {
    if (cocIds.length === 0) {
      return [];
    }
    return this.repository
      .createQueryBuilder("r")
      .select(["r.originalSupplierCocId", "r.rollNumber"])
      .where("r.original_supplier_coc_id IN (:...cocIds)", { cocIds })
      .getMany();
  }

  findReplacementRefsByCocIds(cocIds: number[]): Promise<RubberRollRejection[]> {
    if (cocIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({
      where: { originalSupplierCocId: In(cocIds) },
      select: ["originalSupplierCocId", "replacementSupplierCocId"],
    });
  }
}
