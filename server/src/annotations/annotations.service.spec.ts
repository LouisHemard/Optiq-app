import { Test, TestingModule } from '@nestjs/testing';
import { AnnotationsService } from './annotations.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAnnotation = {
  id: 'ann-1',
  type: 'arrow',
  data: { x: 10, y: 20 },
  color: '#ff0000',
  comment: 'Regardez ici',
  reviewId: 'review-1',
  createdAt: new Date(),
};

const makePrisma = () => ({
  annotation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('AnnotationsService', () => {
  let service: AnnotationsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnnotationsService>(AnnotationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée une annotation avec toutes les données', async () => {
      prisma.annotation.create.mockResolvedValue(mockAnnotation);

      const dto = {
        type: 'arrow',
        data: { x: 10, y: 20 },
        color: '#ff0000',
        comment: 'Regardez ici',
        reviewId: 'review-1',
      };
      const result = await service.create(dto);

      expect(prisma.annotation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'arrow',
            color: '#ff0000',
            comment: 'Regardez ici',
            reviewId: 'review-1',
          }),
        }),
      );
      expect(result).toEqual(mockAnnotation);
    });

    it('utilise #ff0000 comme couleur par défaut si absente', async () => {
      prisma.annotation.create.mockResolvedValue(mockAnnotation);

      await service.create({ type: 'circle', data: {}, reviewId: 'review-1' });

      const call = prisma.annotation.create.mock.calls[0][0];
      expect(call.data.color).toBe('#ff0000');
    });

    it('stocke null pour comment si absent', async () => {
      prisma.annotation.create.mockResolvedValue(mockAnnotation);

      await service.create({ type: 'circle', data: {}, reviewId: 'review-1' });

      const call = prisma.annotation.create.mock.calls[0][0];
      expect(call.data.comment).toBeNull();
    });
  });

  describe('findAll', () => {
    it('retourne toutes les annotations', async () => {
      prisma.annotation.findMany.mockResolvedValue([mockAnnotation]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(prisma.annotation.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('retourne une annotation par id', async () => {
      prisma.annotation.findUniqueOrThrow.mockResolvedValue(mockAnnotation);
      const result = await service.findOne('ann-1');
      expect(prisma.annotation.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'ann-1' } });
      expect(result).toEqual(mockAnnotation);
    });
  });

  describe('update', () => {
    it('met à jour uniquement les champs fournis', async () => {
      const updated = { ...mockAnnotation, comment: 'Nouveau commentaire' };
      prisma.annotation.update.mockResolvedValue(updated);

      const result = await service.update('ann-1', { comment: 'Nouveau commentaire' });

      expect(prisma.annotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ann-1' },
          data: { comment: 'Nouveau commentaire' },
        }),
      );
      expect(result.comment).toBe('Nouveau commentaire');
    });

    it("n'inclut pas les champs undefined dans la mise à jour", async () => {
      prisma.annotation.update.mockResolvedValue(mockAnnotation);

      await service.update('ann-1', { color: '#00ff00' });

      const call = prisma.annotation.update.mock.calls[0][0];
      expect(call.data).not.toHaveProperty('type');
      expect(call.data).not.toHaveProperty('comment');
      expect(call.data.color).toBe('#00ff00');
    });
  });

  describe('remove', () => {
    it('supprime une annotation', async () => {
      prisma.annotation.delete.mockResolvedValue(mockAnnotation);
      const result = await service.remove('ann-1');
      expect(prisma.annotation.delete).toHaveBeenCalledWith({ where: { id: 'ann-1' } });
      expect(result).toEqual(mockAnnotation);
    });
  });
});
