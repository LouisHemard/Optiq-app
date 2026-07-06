import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createReviewDto: CreateReviewDto) {
    const annotations = createReviewDto.annotations ?? [];
    return this.prisma.review.create({
      data: {
        photoId: createReviewDto.photoId,
        userId: createReviewDto.userId,
        content: createReviewDto.content,
        annotations: {
          create: annotations.map((a) => ({
            type: a.type,
            data: a.data as object,
            color: a.color ?? '#ff0000',
            comment: a.comment ?? null,
          })),
        },
      },
      include: {
        annotations: true,
        author: { select: { username: true, avatarUrl: true } },
      },
    });
  }

  findAll() {
    return this.prisma.review.findMany({
      include: {
        annotations: true,
        author: { select: { username: true, avatarUrl: true } },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.review.findUniqueOrThrow({
      where: { id },
      include: {
        annotations: true,
        author: { select: { username: true, avatarUrl: true } },
      },
    });
  }

  findByPhotoId(photoId: string) {
    return this.prisma.review.findMany({
      where: { photoId },
      include: {
        annotations: true,
        author: { select: { username: true, avatarUrl: true } },
      },
    });
  }

  update(id: string, updateReviewDto: UpdateReviewDto) {
    const { annotations: _annotations, ...scalarData } = updateReviewDto;
    return this.prisma.review.update({
      where: { id },
      data: scalarData,
    });
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException();
    if (review.userId !== userId) throw new ForbiddenException();
    return this.prisma.review.delete({ where: { id } });
  }
}
