import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomFieldValueRepository } from "./custom-field-value.repository";
import { CustomFieldValue } from "./entities/custom-field-value.entity";

@Injectable()
export class PostgresCustomFieldValueRepository
  extends TypeOrmCrudRepository<CustomFieldValue>
  implements CustomFieldValueRepository
{
  constructor(@InjectRepository(CustomFieldValue) repository: Repository<CustomFieldValue>) {
    super(repository);
  }

  findByEntityAndField(
    entityType: "customer" | "supplier",
    entityId: number,
    fieldName: string,
  ): Promise<CustomFieldValue | null> {
    return this.repository.findOne({
      where: {
        entityType,
        entityId,
        fieldName,
      },
    });
  }

  findForEntityOrdered(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<CustomFieldValue[]> {
    return this.repository.find({
      where: { entityType, entityId },
      order: { fieldName: "ASC" },
    });
  }

  findByIdOrFail(id: number): Promise<CustomFieldValue> {
    return this.repository.findOneOrFail({
      where: { id },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
