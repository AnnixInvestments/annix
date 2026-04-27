import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Testimonial } from "./entities/testimonial.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import {
  CreateTestimonialDto,
  TestimonialsService,
  UpdateTestimonialDto,
} from "./testimonials.service";

@ApiTags("AU Rubber Testimonials")
@Controller("rubber-lining/testimonials")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard)
@ApiBearerAuth()
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  @ApiOperation({ summary: "List all testimonials (admin)" })
  @ApiResponse({ status: 200, type: [Testimonial] })
  async testimonials(): Promise<Testimonial[]> {
    return this.testimonialsService.allTestimonials();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get testimonial by ID (admin)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: Testimonial })
  async testimonial(@Param("id", ParseUUIDPipe) id: string): Promise<Testimonial> {
    return this.testimonialsService.testimonialById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new testimonial" })
  @ApiResponse({ status: 201, type: Testimonial })
  async createTestimonial(@Body() dto: CreateTestimonialDto): Promise<Testimonial> {
    return this.testimonialsService.createTestimonial(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a testimonial" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: Testimonial })
  async updateTestimonial(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialDto,
  ): Promise<Testimonial> {
    return this.testimonialsService.updateTestimonial(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a testimonial" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200 })
  async deleteTestimonial(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.testimonialsService.deleteTestimonial(id);
  }
}
