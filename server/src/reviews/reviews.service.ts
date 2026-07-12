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

  async create(createReviewDto: CreateReviewDto, reviewerId: string) {
    const annotations = createReviewDto.annotations ?? [];
    const review = await this.prisma.review.create({
      data: {
        photoId: createReviewDto.photoId,
        userId: reviewerId,
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
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    const photo = await this.prisma.photo.findUnique({
      where: { id: createReviewDto.photoId },
      select: { userId: true, title: true },
    });

    if (photo && photo.userId !== reviewerId) {
      await this.prisma.notification.create({
        data: {
          userId: photo.userId,
          type: 'NEW_REVIEW',
          message: `${review.author.username} a critiqué votre photo "${photo.title}".`,
          relatedId: createReviewDto.photoId,
        },
      });
    }

    return review;
  }

  findAll() {
    return this.prisma.review.findMany({
      include: {
        annotations: true,
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.review.findUniqueOrThrow({
      where: { id },
      include: {
        annotations: true,
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  findByPhotoId(photoId: string) {
    return this.prisma.review.findMany({
      where: { photoId },
      include: {
        annotations: true,
        author: { select: { id: true, username: true, avatarUrl: true } },
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
