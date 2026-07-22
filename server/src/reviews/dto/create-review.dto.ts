import { IsString, IsUUID, IsOptional, IsArray, ValidateNested, IsObject, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewAnnotationDto {
  @IsString()
  type: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class CreateReviewDto {
  @IsUUID()
  photoId: string;

  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReviewAnnotationDto)
  annotations?: CreateReviewAnnotationDto[];
}
