import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import exifr from 'exifr';
import { Prisma } from '@prisma/client';

const FALLBACK_IMAGE_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIj48cmVjdCBmaWxsPSIjMzc0MTUxIiB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjI0Ij5QaG90byBPcHRpcTwvdGV4dD48L3N2Zz4=';

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorage: LocalStorageService,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  private async resolveImageUrl(file: Express.Multer.File): Promise<string> {
    if (this.supabaseStorage.isConfigured()) {
      try {
        return await this.supabaseStorage.save(file);
      } catch (err) {
        console.warn(
          '[PhotosService] Supabase upload failed, falling back to local:',
          (err as Error)?.message,
        );
      }
    }
    try {
      return this.localStorage.save(file);
    } catch (err) {
      console.warn(
        '[PhotosService] Local storage failed, using fallback URL:',
        (err as Error)?.message,
      );
      return FALLBACK_IMAGE_URL;
    }
  }

  async create(file: Express.Multer.File, createPhotoDto: CreatePhotoDto, userId: string) {
    const exif = await this.extractExif(file.buffer);
    const imageUrl = await this.resolveImageUrl(file);

    return this.prisma.photo.create({
      data: {
        title: createPhotoDto.title,
        description: createPhotoDto.description ?? null,
        imageUrl,
        userId,
        iso: exif.iso,
        aperture: exif.aperture,
        shutterSpeed: exif.shutterSpeed,
        cameraModel: createPhotoDto.cameraModel?.trim() || null,
        lensModel: exif.lensModel,
        focalLength: exif.focalLength,
      },
    });
  }

  private async extractExif(buffer: Buffer): Promise<{
    iso?: number;
    aperture?: number;
    shutterSpeed?: string;
    cameraModel?: string;
    lensModel?: string;
    focalLength?: number;
  }> {
    try {
      const tags = await exifr.parse(buffer, true);
      if (!tags || typeof tags !== 'object') {
        return {};
      }

      const isoRaw = tags.ISO != null ? Number(tags.ISO) : undefined;
      const aperture = tags.FNumber != null ? Number(tags.FNumber) : undefined;
      const exposureTime = tags.ExposureTime;
      const shutterSpeed =
        exposureTime != null ? String(exposureTime) : undefined;
      const cameraModel =
        typeof tags.Model === 'string' ? tags.Model : undefined;
      const lensModel =
        typeof tags.LensModel === 'string' ? tags.LensModel : undefined;
      const focalLengthRaw =
        tags.FocalLength != null ? Number(tags.FocalLength) : undefined;

      const result: {
        iso?: number;
        aperture?: number;
        shutterSpeed?: string;
        cameraModel?: string;
        lensModel?: string;
        focalLength?: number;
      } = {};
      if (isoRaw !== undefined && Number.isInteger(isoRaw) && isoRaw >= 0) {
        result.iso = isoRaw;
      }
      if (typeof aperture === 'number' && !Number.isNaN(aperture)) {
        result.aperture = aperture;
      }
      if (shutterSpeed) result.shutterSpeed = shutterSpeed;
      if (cameraModel) result.cameraModel = cameraModel;
      if (lensModel) result.lensModel = lensModel;
      if (
        focalLengthRaw !== undefined &&
        Number.isInteger(focalLengthRaw) &&
        focalLengthRaw >= 0
      ) {
        result.focalLength = focalLengthRaw;
      }
      return result;
    } catch {
      return {};
    }
  }

  findAll() {
    return this.prisma.photo.findMany();
  }

  async getFeed(query: FeedQueryDto, currentUserId?: string) {
    const where: Prisma.PhotoWhereInput = {};

    if (query.cameraModel?.trim()) {
      where.cameraModel = {
        contains: query.cameraModel.trim(),
        mode: 'insensitive',
      };
    }
    if (query.lensModel?.trim()) {
      where.lensModel = {
        contains: query.lensModel.trim(),
        mode: 'insensitive',
      };
    }
    const minIso = query.minIso != null ? Number(query.minIso) : undefined;
    const maxIso = query.maxIso != null ? Number(query.maxIso) : undefined;
    if (Number.isFinite(minIso) || Number.isFinite(maxIso)) {
      where.iso = {
        ...(Number.isFinite(minIso) && { gte: minIso }),
        ...(Number.isFinite(maxIso) && { lte: maxIso }),
      };
    }
    const minAperture =
      query.minAperture != null ? Number(query.minAperture) : undefined;
    const maxAperture =
      query.maxAperture != null ? Number(query.maxAperture) : undefined;
    if (Number.isFinite(minAperture) || Number.isFinite(maxAperture)) {
      where.aperture = {
        ...(Number.isFinite(minAperture) && { gte: minAperture }),
        ...(Number.isFinite(maxAperture) && { lte: maxAperture }),
      };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));

    const photos = await this.prisma.photo.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { reviews: true, likes: true } },
        ...(currentUserId && {
          likes: { where: { userId: currentUserId }, select: { userId: true } },
        }),
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return photos.map(({ likes, ...photo }) => ({
      ...photo,
      isLikedByMe: currentUserId ? (likes?.length ?? 0) > 0 : false,
    }));
  }

  async incrementPerfect(id: string, userId: string) {
    const existing = await this.prisma.userPerfectVote.findUnique({
      where: { userId_photoId: { userId, photoId: id } },
    });
    if (existing) throw new ConflictException('Vous avez déjà voté pour cette photo.');
    await this.prisma.userPerfectVote.create({ data: { userId, photoId: id } });
    return this.prisma.photo.update({
      where: { id },
      data: { perfectCount: { increment: 1 } },
    });
  }

  async findOne(id: string, currentUserId?: string) {
    const [photo, perfectVote] = await Promise.all([
      this.prisma.photo.findUniqueOrThrow({
        where: { id },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { reviews: true, likes: true } },
          ...(currentUserId && {
            likes: { where: { userId: currentUserId }, select: { userId: true } },
          }),
        },
      }),
      currentUserId
        ? this.prisma.userPerfectVote.findUnique({
            where: { userId_photoId: { userId: currentUserId, photoId: id } },
          })
        : null,
    ]);
    const { likes, ...rest } = photo as typeof photo & {
      likes?: { userId: string }[];
    };
    return {
      ...rest,
      isLikedByMe: currentUserId ? (likes?.length ?? 0) > 0 : false,
      hasVotedPerfect: perfectVote !== null,
    };
  }

  async getExplore(currentUserId?: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const photos = await this.prisma.photo.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      take: 20,
      orderBy: [
        { perfectCount: 'desc' },
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { reviews: true, likes: true } },
        ...(currentUserId && {
          likes: { where: { userId: currentUserId }, select: { userId: true } },
        }),
      },
    });

    return photos.map(({ likes, ...photo }) => ({
      ...photo,
      isLikedByMe: currentUserId ? (likes?.length ?? 0) > 0 : false,
    }));
  }

  async toggleLike(photoId: string, userId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_photoId: { userId, photoId } },
    });
    if (existing) {
      await this.prisma.like.delete({
        where: { userId_photoId: { userId, photoId } },
      });
      const count = await this.prisma.like.count({ where: { photoId } });
      return { liked: false, likesCount: count };
    }
    await this.prisma.like.create({ data: { userId, photoId } });
    const count = await this.prisma.like.count({ where: { photoId } });
    return { liked: true, likesCount: count };
  }

  async update(id: string, updatePhotoDto: UpdatePhotoDto, userId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo introuvable.');
    if (photo.userId !== userId) throw new ForbiddenException('Vous ne pouvez pas modifier cette photo.');
    return this.prisma.photo.update({ where: { id }, data: updatePhotoDto });
  }

  async remove(id: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo introuvable.');
    if (photo.userId !== userId) throw new ForbiddenException('Vous ne pouvez pas supprimer cette photo.');
    return this.prisma.photo.delete({ where: { id } });
  }
}
