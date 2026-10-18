import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  coverImageUrl?: string;
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
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string | null;
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
