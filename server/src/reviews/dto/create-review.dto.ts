export class CreateReviewAnnotationDto {
  type: string;
  data: Record<string, unknown>;
  color?: string;
  comment?: string;
}

export class CreateReviewDto {
  photoId: string;
  userId: string;
  content: string;
  annotations?: CreateReviewAnnotationDto[];
}
