import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

const mockReview = {
  id: 'review-1',
  photoId: 'photo-1',
  userId: 'user-1',
  content: 'Belle photo, bonne lumière.',
  annotations: [],
  author: { username: 'alice', avatarUrl: null },
  createdAt: new Date(),
};

const makePrisma = () => ({
  review: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée une review sans annotations', async () => {
      prisma.review.create.mockResolvedValue(mockReview);

      const dto = { photoId: 'photo-1', userId: 'user-1', content: 'Belle photo, bonne lumière.' };
      const result = await service.create(dto);

      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            photoId: 'photo-1',
            userId: 'user-1',
            content: 'Belle photo, bonne lumière.',
            annotations: { create: [] },
          }),
        }),
      );
      expect(result).toEqual(mockReview);
    });

    it('crée une review avec annotations', async () => {
      const reviewWithAnnotations = { ...mockReview, annotations: [{ id: 'ann-1' }] };
      prisma.review.create.mockResolvedValue(reviewWithAnnotations);

      const dto = {
        photoId: 'photo-1',
        userId: 'user-1',
        content: 'Bon cadrage.',
        annotations: [{ type: 'arrow', data: { x: 10, y: 20 }, color: '#00ff00', comment: 'ici' }],
      };
      const result = await service.create(dto);

      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            annotations: {
              create: [
                expect.objectContaining({ type: 'arrow', color: '#00ff00', comment: 'ici' }),
              ],
            },
          }),
        }),
      );
      expect(result.annotations).toHaveLength(1);
    });

    it('utilise #ff0000 comme couleur par défaut si non fournie', async () => {
      prisma.review.create.mockResolvedValue(mockReview);

      const dto = {
        photoId: 'photo-1',
        userId: 'user-1',
        content: 'Test.',
        annotations: [{ type: 'circle', data: {} }],
      };
      await service.create(dto);

      const createCall = prisma.review.create.mock.calls[0][0];
      expect(createCall.data.annotations.create[0].color).toBe('#ff0000');
    });
  });

  describe('findAll', () => {
    it('retourne toutes les reviews', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining({ annotations: true }) }),
      );
    });
  });

  describe('findOne', () => {
    it('retourne la review correspondante', async () => {
      prisma.review.findUniqueOrThrow.mockResolvedValue(mockReview);
      const result = await service.findOne('review-1');
      expect(prisma.review.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'review-1' } }),
      );
      expect(result).toEqual(mockReview);
    });
  });

  describe('findByPhotoId', () => {
    it('retourne les reviews filtrées par photo', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      const result = await service.findByPhotoId('photo-1');
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { photoId: 'photo-1' } }),
      );
      expect(result).toEqual([mockReview]);
    });
  });

  describe('update', () => {
    it('met à jour le contenu de la review', async () => {
      const updated = { ...mockReview, content: 'Mise à jour.' };
      prisma.review.update.mockResolvedValue(updated);

      const result = await service.update('review-1', { content: 'Mise à jour.' });

      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'review-1' } }),
      );
      expect(result.content).toBe('Mise à jour.');
    });
  });

  describe('remove', () => {
    it("supprime la review si l'utilisateur en est l'auteur", async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.delete.mockResolvedValue(mockReview);

      const result = await service.remove('review-1', 'user-1');

      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'review-1' } });
      expect(result).toEqual(mockReview);
    });

    it('lève NotFoundException si la review est introuvable', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistant', 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.review.delete).not.toHaveBeenCalled();
    });

    it("lève ForbiddenException si l'utilisateur n'est pas l'auteur", async () => {
      prisma.review.findUnique.mockResolvedValue({ ...mockReview, userId: 'autre-user' });

      await expect(service.remove('review-1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.review.delete).not.toHaveBeenCalled();
    });
  });
});
