import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Covers are either uploaded API media (site-relative /uploads/...) or an
 * absolute http(s) URL. Anything else (javascript:, bare words, //host) would
 * produce a broken Next/Image source or a bad og:image.
 */
const IMAGE_URL_PATTERN = /^(?:https?:\/\/\S+|\/(?!\/)\S+)$/i;

export class CreateArticleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, {
    message: "slug must be lowercase alphanumeric with hyphens",
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(IMAGE_URL_PATTERN, {
    message: "coverImageUrl must be an http(s) URL or a /uploads/... path",
  })
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  seoDescription?: string;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, {
    message: "slug must be lowercase alphanumeric with hyphens",
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(IMAGE_URL_PATTERN, {
    message: "coverImageUrl must be an http(s) URL or a /uploads/... path",
  })
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  seoDescription?: string | null;
}

/** Reviewer sends an in-review story back to the author with a note. */
export class RequestChangesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  note!: string;
}

/** Schedule an in-review story for automatic publishing (ISO-8601). */
export class ScheduleArticleDto {
  @IsDateString()
  scheduledFor!: string;
}

/** Bulk workflow actions on up to 50 articles at once. */
export const BULK_ACTIONS = [
  "archive",
  "restore",
  "publish",
  "set-category",
] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

export class BulkArticlesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  ids!: string[];

  @IsIn(BULK_ACTIONS)
  action!: BulkAction;

  /** Required for `set-category` (validated in the service). */
  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}
