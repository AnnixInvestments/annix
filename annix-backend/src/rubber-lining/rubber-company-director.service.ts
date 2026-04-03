import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RubberCompanyDirector } from "./entities/rubber-company-director.entity";

export interface CreateDirectorDto {
  name: string;
  title: string;
  email: string;
}

export interface UpdateDirectorDto {
  name?: string;
  title?: string;
  email?: string;
  isActive?: boolean;
}

export interface DirectorDto {
  id: number;
  name: string;
  title: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RubberCompanyDirectorService {
  private readonly logger = new Logger(RubberCompanyDirectorService.name);

  constructor(
    @InjectRepository(RubberCompanyDirector)
    private readonly directorRepository: Repository<RubberCompanyDirector>,
  ) {}

  async allDirectors(): Promise<DirectorDto[]> {
    const directors = await this.directorRepository.find({
      order: { name: "ASC" },
    });
    return directors.map((d) => this.mapToDto(d));
  }

  async activeDirectors(): Promise<DirectorDto[]> {
    const directors = await this.directorRepository.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
    return directors.map((d) => this.mapToDto(d));
  }

  async createDirector(dto: CreateDirectorDto): Promise<DirectorDto> {
    const director = this.directorRepository.create({
      name: dto.name,
      title: dto.title,
      email: dto.email,
    });
    const saved = await this.directorRepository.save(director);
    this.logger.log(`Created director: ${saved.name} (${saved.id})`);
    return this.mapToDto(saved);
  }

  async updateDirector(id: number, dto: UpdateDirectorDto): Promise<DirectorDto | null> {
    const director = await this.directorRepository.findOne({ where: { id } });
    if (!director) {
      return null;
    }
    if (dto.name !== undefined) director.name = dto.name;
    if (dto.title !== undefined) director.title = dto.title;
    if (dto.email !== undefined) director.email = dto.email;
    if (dto.isActive !== undefined) director.isActive = dto.isActive;
    const saved = await this.directorRepository.save(director);
    return this.mapToDto(saved);
  }

  async deleteDirector(id: number): Promise<boolean> {
    const result = await this.directorRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  private mapToDto(director: RubberCompanyDirector): DirectorDto {
    return {
      id: director.id,
      name: director.name,
      title: director.title,
      email: director.email,
      isActive: director.isActive,
      createdAt: director.createdAt.toISOString(),
      updatedAt: director.updatedAt.toISOString(),
    };
  }
}
