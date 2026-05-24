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
import { FeatureLicenseGuard, RequireFeature } from "../licensing";
import { BlogPostsService, CreateBlogPostDto, UpdateBlogPostDto } from "./blog-posts.service";
import { AU_RUBBER_FEATURES, AU_RUBBER_MODULE_KEY } from "./config/au-rubber-licensing";
import { BlogPost } from "./entities/blog-post.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";

@ApiTags("AU Rubber Blog Posts")
@Controller("rubber-lining/blog-posts")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard, FeatureLicenseGuard)
@RequireFeature(AU_RUBBER_MODULE_KEY, AU_RUBBER_FEATURES.WEBSITE_CMS)
@ApiBearerAuth()
export class BlogPostsController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

  @Get()
  @ApiOperation({ summary: "List all blog posts (admin)" })
  @ApiResponse({ status: 200, type: [BlogPost] })
  async posts(): Promise<BlogPost[]> {
    return this.blogPostsService.allPosts();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get blog post by ID (admin)" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: BlogPost })
  async post(@Param("id", ParseUUIDPipe) id: string): Promise<BlogPost> {
    return this.blogPostsService.postById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new blog post" })
  @ApiResponse({ status: 201, type: BlogPost })
  async createPost(@Body() dto: CreateBlogPostDto): Promise<BlogPost> {
    return this.blogPostsService.createPost(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a blog post" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: BlogPost })
  async updatePost(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<BlogPost> {
    return this.blogPostsService.updatePost(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a blog post" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200 })
  async deletePost(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.blogPostsService.deletePost(id);
  }
}
