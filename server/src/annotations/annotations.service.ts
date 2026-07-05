import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';

@Injectable()
export class AnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createAnnotationDto: CreateAnnotationDto) {
    return this.prisma.annotation.create({
      data: {
        type: createAnnotationDto.type,
        data: createAnnotationDto.data as object,
        color: createAnnotationDto.color ?? '#ff0000',
        comment: createAnnotationDto.comment ?? null,
        reviewId: createAnnotationDto.reviewId,
      },
    });
  }

  findAll() {
    return this.prisma.annotation.findMany();
  }

  findOne(id: string) {
    return this.prisma.annotation.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, updateAnnotationDto: UpdateAnnotationDto) {
    return this.prisma.annotation.update({
      where: { id },
      data: {
        ...(updateAnnotationDto.type !== undefined && { type: updateAnnotationDto.type }),
        ...(updateAnnotationDto.data !== undefined && { data: updateAnnotationDto.data as object }),
        ...(updateAnnotationDto.color !== undefined && { color: updateAnnotationDto.color }),
        ...(updateAnnotationDto.comment !== undefined && { comment: updateAnnotationDto.comment }),
      },
    });
  }

  remove(id: string) {
    return this.prisma.annotation.delete({ where: { id } });
  }
}
