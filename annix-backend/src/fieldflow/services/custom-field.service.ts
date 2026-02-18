import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCustomFieldDto, UpdateCustomFieldDto } from "../dto";
import { CustomFieldDefinition, CustomFieldType } from "../entities";

@Injectable()
export class CustomFieldService {
  private readonly logger = new Logger(CustomFieldService.name);

  constructor(
    @InjectRepository(CustomFieldDefinition)
    private readonly customFieldRepo: Repository<CustomFieldDefinition>,
  ) {}

  async create(userId: number, dto: CreateCustomFieldDto): Promise<CustomFieldDefinition> {
    const existing = await this.customFieldRepo.findOne({
      where: { userId, fieldKey: dto.fieldKey },
    });

    if (existing) {
      throw new ConflictException(`Field with key "${dto.fieldKey}" already exists`);
    }

    const field = this.customFieldRepo.create({
      userId,
      name: dto.name,
      fieldKey: dto.fieldKey,
      fieldType: dto.fieldType ?? CustomFieldType.TEXT,
      isRequired: dto.isRequired ?? false,
      options: dto.options ?? null,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
    });

    const saved = await this.customFieldRepo.save(field);
    this.logger.log(`Custom field created: ${saved.id} (${dto.fieldKey}) by user ${userId}`);
    return saved;
  }

  async findAll(userId: number, includeInactive = false): Promise<CustomFieldDefinition[]> {
    const where = includeInactive ? { userId } : { userId, isActive: true };
    return this.customFieldRepo.find({
      where,
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  async findOne(userId: number, id: number): Promise<CustomFieldDefinition> {
    const field = await this.customFieldRepo.findOne({
      where: { id, userId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field ${id} not found`);
    }

    return field;
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateCustomFieldDto,
  ): Promise<CustomFieldDefinition> {
    const field = await this.findOne(userId, id);

    if (dto.fieldKey && dto.fieldKey !== field.fieldKey) {
      const existing = await this.customFieldRepo.findOne({
        where: { userId, fieldKey: dto.fieldKey },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Field with key "${dto.fieldKey}" already exists`);
      }
    }

    if (dto.name !== undefined) field.name = dto.name;
    if (dto.fieldKey !== undefined) field.fieldKey = dto.fieldKey;
    if (dto.fieldType !== undefined) field.fieldType = dto.fieldType;
    if (dto.isRequired !== undefined) field.isRequired = dto.isRequired;
    if (dto.options !== undefined) field.options = dto.options ?? null;
    if (dto.displayOrder !== undefined) field.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) field.isActive = dto.isActive;

    return this.customFieldRepo.save(field);
  }

  async remove(userId: number, id: number): Promise<void> {
    const field = await this.findOne(userId, id);
    await this.customFieldRepo.remove(field);
    this.logger.log(`Custom field deleted: ${id} by user ${userId}`);
  }

  async reorder(userId: number, orderedIds: number[]): Promise<CustomFieldDefinition[]> {
    const fields = await this.findAll(userId, true);
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    const updatedFields = orderedIds
      .map((id, index) => {
        const field = fieldMap.get(id);
        if (field) {
          field.displayOrder = index;
          return field;
        }
        return null;
      })
      .filter((f): f is CustomFieldDefinition => f !== null);

    await this.customFieldRepo.save(updatedFields);
    return this.findAll(userId, true);
  }
}
