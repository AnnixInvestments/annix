import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 25;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const buildPaginatedResult = <T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResult<T> => ({
  items,
  total,
  page: query.page,
  limit: query.limit,
  totalPages: Math.max(1, Math.ceil(total / query.limit)),
});
