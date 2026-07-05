export class CreateAnnotationDto {
  type: string;
  data: Record<string, unknown>;
  color?: string;
  comment?: string;
  reviewId: string;
}
