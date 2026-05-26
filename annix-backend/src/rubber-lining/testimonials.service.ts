import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Testimonial, type TestimonialSource } from "./entities/testimonial.entity";
import { TestimonialRepository } from "./repositories/testimonial.repository";

export interface CreateTestimonialDto {
  authorName: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source?: TestimonialSource;
  highlight?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateTestimonialDto {
  authorName?: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  rating?: number;
  body?: string;
  datePublished?: string;
  source?: TestimonialSource;
  highlight?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(private readonly testimonialRepository: TestimonialRepository) {}

  async publishedTestimonials(): Promise<Testimonial[]> {
    return this.testimonialRepository.findPublishedOrdered();
  }

  async allTestimonials(): Promise<Testimonial[]> {
    return this.testimonialRepository.findAllOrdered();
  }

  async testimonialById(id: string): Promise<Testimonial> {
    const testimonial = await this.testimonialRepository.findById(id);
    if (!testimonial) {
      throw new NotFoundException(`Testimonial not found: ${id}`);
    }
    return testimonial;
  }

  async createTestimonial(dto: CreateTestimonialDto): Promise<Testimonial> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("Rating must be between 1 and 5");
    }
    const testimonial = this.testimonialRepository.build({
      authorName: dto.authorName,
      authorRole: dto.authorRole || null,
      authorCompany: dto.authorCompany || null,
      rating: dto.rating,
      body: dto.body,
      datePublished: dto.datePublished,
      source: dto.source || "manual",
      highlight: dto.highlight || false,
      isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
      sortOrder: dto.sortOrder || 0,
    });
    const saved = await this.testimonialRepository.save(testimonial);
    this.logger.log(`Created testimonial from ${saved.authorName} (${saved.id})`);
    return saved;
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto): Promise<Testimonial> {
    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw new BadRequestException("Rating must be between 1 and 5");
    }
    const testimonial = await this.testimonialById(id);
    Object.assign(testimonial, dto);
    const saved = await this.testimonialRepository.save(testimonial);
    this.logger.log(`Updated testimonial ${saved.id} (${saved.authorName})`);
    return saved;
  }

  async deleteTestimonial(id: string): Promise<void> {
    const testimonial = await this.testimonialById(id);
    await this.testimonialRepository.remove(testimonial);
    this.logger.log(`Deleted testimonial ${id} (${testimonial.authorName})`);
  }
}
