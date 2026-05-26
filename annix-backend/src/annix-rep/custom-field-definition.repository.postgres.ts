import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomFieldDefinitionRepository } from "./custom-field-definition.repository";
import { CustomFieldDefinition } from "./entities/custom-field-definition.entity";

@Injectable()
export class PostgresCustomFieldDefinitionRepository
  extends TypeOrmCrudRepository<CustomFieldDefinition>
  implements CustomFieldDefinitionRepository
{
  constructor(
    @InjectRepository(CustomFieldDefinition) repository: Repository<CustomFieldDefinition>,
  ) {
    super(repository);
  }

  findByUserAndKey(userId: number, fieldKey: string): Promise<CustomFieldDefinition | null> {
    return this.repository.findOne({ where: { userId, fieldKey } });
  }

  findByIdAndUser(id: number, userId: number): Promise<CustomFieldDefinition | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  findForUser(userId: number, includeInactive: boolean): Promise<CustomFieldDefinition[]> {
    const where = includeInactive ? { userId } : { userId, isActive: true };
    return this.repository.find({
      where,
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  saveMany(fields: CustomFieldDefinition[]): Promise<CustomFieldDefinition[]> {
    return this.repository.save(fields);
  }
}
