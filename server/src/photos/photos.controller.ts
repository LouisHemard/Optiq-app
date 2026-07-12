import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { FeedQueryDto } from './dto/feed-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../auth/jwt-auth-optional.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator';

@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createPhotoDto: CreatePhotoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException(
        'Un fichier image est requis (champ "file")',
      );
    }
    return this.photosService.create(file, createPhotoDto, user.id);
  }

  @Get()
  findAll() {
    return this.photosService.findAll();
  }

  @Get('feed')
  @UseGuards(JwtAuthOptionalGuard)
  getFeed(
    @Query() query: FeedQueryDto,
    @CurrentUser() user: CurrentUserPayload | null,
  ) {
    return this.photosService.getFeed(query, user?.id);
  }

  @Get('explore')
  @UseGuards(JwtAuthOptionalGuard)
  getExplore(@CurrentUser() user: CurrentUserPayload | null) {
    return this.photosService.getExplore(user?.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthOptionalGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload | null,
  ) {
    return this.photosService.findOne(id, user?.id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.photosService.toggleLike(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updatePhotoDto: UpdatePhotoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.photosService.update(id, updatePhotoDto, user.id);
  }

  @Patch(':id/perfect')
  @UseGuards(JwtAuthGuard)
  incrementPerfect(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.photosService.incrementPerfect(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.photosService.remove(id, user.id);
  }
}
