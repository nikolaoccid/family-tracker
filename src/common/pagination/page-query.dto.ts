import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const DEFAULT_PAGE_LIMIT = 500;
export const MAX_PAGE_LIMIT = 1000;
export const NEXT_CURSOR_HEADER = 'X-Next-Cursor';

/** Optional paging inputs shared by every list endpoint. Omitting both keeps the old unpaged behaviour (up to the default cap). */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;
}
