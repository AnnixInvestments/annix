import { Injectable, Logger } from "@nestjs/common";
import { RubberCompanyDirector } from "./entities/rubber-company-director.entity";
import { RubberCompanyDirectorRepository } from "./repositories/rubber-company-director.repository";

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

  constructor(private readonly directorRepository: RubberCompanyDirectorRepository) {}

  async allDirectors(): Promise<DirectorDto[]> {
    const directors = await this.directorRepository.findAllOrderedByName();
    return directors.map((d) => this.mapToDto(d));
  }

  async activeDirectors(): Promise<DirectorDto[]> {
    const directors = await this.directorRepository.findActiveOrderedByName();
    return directors.map((d) => this.mapToDto(d));
  }

  async createDirector(dto: CreateDirectorDto): Promise<DirectorDto> {
    const director = this.directorRepository.build({
      name: dto.name,
      title: dto.title,
      email: dto.email,
    });
    const saved = await this.directorRepository.save(director);
    this.logger.log(`Created director: ${saved.name} (${saved.id})`);
    return this.mapToDto(saved);
  }

  async updateDirector(id: number, dto: UpdateDirectorDto): Promise<DirectorDto | null> {
    const director = await this.directorRepository.findById(id);
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
    return this.directorRepository.deleteById(id);
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
