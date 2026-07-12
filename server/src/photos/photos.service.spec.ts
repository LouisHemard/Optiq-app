import { Test, TestingModule } from '@nestjs/testing';
import { PhotosService } from './photos.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

jest.mock('exifr', () => ({
  default: { parse: jest.fn().mockResolvedValue(null) },
}));

const mockPhoto = {
  id: 'photo-1',
  title: 'Coucher de soleil',
  description: 'Belle lumière dorée',
  imageUrl: 'https://storage/photo.jpg',
  userId: 'user-1',
  iso: 200,
  aperture: 2.8,
  shutterSpeed: '1/500',
  cameraModel: 'Sony A7IV',
  lensModel: null,
  focalLength: 85,
  perfectCount: 0,
  createdAt: new Date(),
  user: { id: 'user-1', username: 'alice', avatarUrl: null },
  _count: { reviews: 3, likes: 12 },
  likes: [],
};

const makePrisma = () => ({
  photo: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  like: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userPerfectVote: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
});

const makeLocalStorage = () => ({ save: jest.fn().mockReturnValue('http://localhost/uploads/photo.jpg') });
const makeSupabaseStorage = () => ({ isConfigured: jest.fn().mockReturnValue(false), save: jest.fn() });

describe('PhotosService', () => {
  let service: PhotosService;
  let prisma: ReturnType<typeof makePrisma>;
  let localStorage: ReturnType<typeof makeLocalStorage>;
  let supabaseStorage: ReturnType<typeof makeSupabaseStorage>;

  beforeEach(async () => {
    prisma = makePrisma();
    localStorage = makeLocalStorage();
    supabaseStorage = makeSupabaseStorage();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: PrismaService, useValue: prisma },
        { provide: LocalStorageService, useValue: localStorage },
        { provide: SupabaseStorageService, useValue: supabaseStorage },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const fakeFile = {
      originalname: 'photo.jpg',
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('crée une photo en passant par le stockage local si Supabase non configuré', async () => {
      prisma.photo.create.mockResolvedValue(mockPhoto);
      supabaseStorage.isConfigured.mockReturnValue(false);

      const dto = { title: 'Coucher de soleil' };
      const result = await service.create(fakeFile, dto, 'user-1');

      expect(localStorage.save).toHaveBeenCalledWith(fakeFile);
      expect(prisma.photo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Coucher de soleil', userId: 'user-1' }),
        }),
      );
      expect(result).toEqual(mockPhoto);
    });

    it('utilise Supabase si configuré', async () => {
      supabaseStorage.isConfigured.mockReturnValue(true);
      supabaseStorage.save.mockResolvedValue('https://supabase/photo.jpg');
      prisma.photo.create.mockResolvedValue(mockPhoto);

      await service.create(fakeFile, { title: 'Test' }, 'user-1');

      expect(supabaseStorage.save).toHaveBeenCalledWith(fakeFile);
      expect(localStorage.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('retourne toutes les photos', async () => {
      prisma.photo.findMany.mockResolvedValue([mockPhoto]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retourne une photo avec isLikedByMe=true si likée', async () => {
      prisma.photo.findUniqueOrThrow.mockResolvedValue({
        ...mockPhoto,
        likes: [{ userId: 'user-1' }],
      });

      const result = await service.findOne('photo-1', 'user-1');

      expect(result.isLikedByMe).toBe(true);
    });

    it('retourne isLikedByMe=false si non likée', async () => {
      prisma.photo.findUniqueOrThrow.mockResolvedValue({ ...mockPhoto, likes: [] });

      const result = await service.findOne('photo-1', 'user-1');

      expect(result.isLikedByMe).toBe(false);
    });

    it('retourne isLikedByMe=false sans userId', async () => {
      prisma.photo.findUniqueOrThrow.mockResolvedValue(mockPhoto);

      const result = await service.findOne('photo-1');

      expect(result.isLikedByMe).toBe(false);
    });
  });

  describe('getFeed', () => {
    it('retourne les photos avec isLikedByMe calculé', async () => {
      const photoWithLike = { ...mockPhoto, likes: [{ userId: 'user-1' }] };
      prisma.photo.findMany.mockResolvedValue([photoWithLike]);

      const result = await service.getFeed({}, 'user-1');

      expect(result[0].isLikedByMe).toBe(true);
    });

    it('filtre par cameraModel si fourni', async () => {
      prisma.photo.findMany.mockResolvedValue([]);

      await service.getFeed({ cameraModel: 'Sony' }, 'user-1');

      const call = prisma.photo.findMany.mock.calls[0][0];
      expect(call.where.cameraModel).toEqual(
        expect.objectContaining({ contains: 'Sony', mode: 'insensitive' }),
      );
    });

    it('filtre par plage ISO si fourni', async () => {
      prisma.photo.findMany.mockResolvedValue([]);

      await service.getFeed({ minIso: 100, maxIso: 800 });

      const call = prisma.photo.findMany.mock.calls[0][0];
      expect(call.where.iso).toEqual({ gte: 100, lte: 800 });
    });
  });

  describe('toggleLike', () => {
    it('ajoute un like si inexistant', async () => {
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.like.create.mockResolvedValue({});
      prisma.like.count.mockResolvedValue(5);

      const result = await service.toggleLike('photo-1', 'user-1');

      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', photoId: 'photo-1' },
      });
      expect(result).toEqual({ liked: true, likesCount: 5 });
    });

    it('retire le like si déjà existant', async () => {
      prisma.like.findUnique.mockResolvedValue({ userId: 'user-1', photoId: 'photo-1' });
      prisma.like.delete.mockResolvedValue({});
      prisma.like.count.mockResolvedValue(4);

      const result = await service.toggleLike('photo-1', 'user-1');

      expect(prisma.like.delete).toHaveBeenCalled();
      expect(result).toEqual({ liked: false, likesCount: 4 });
    });
  });

  describe('update', () => {
    it('met à jour une photo', async () => {
      const updated = { ...mockPhoto, title: 'Nouveau titre' };
      prisma.photo.findUnique.mockResolvedValue(mockPhoto);
      prisma.photo.update.mockResolvedValue(updated);

      const result = await service.update('photo-1', { title: 'Nouveau titre' }, 'user-1');

      expect(prisma.photo.update).toHaveBeenCalledWith({
        where: { id: 'photo-1' },
        data: { title: 'Nouveau titre' },
      });
      expect(result.title).toBe('Nouveau titre');
    });
  });

  describe('remove', () => {
    it('supprime une photo', async () => {
      prisma.photo.findUnique.mockResolvedValue(mockPhoto);
      prisma.photo.delete.mockResolvedValue(mockPhoto);

      const result = await service.remove('photo-1', 'user-1');

      expect(prisma.photo.delete).toHaveBeenCalledWith({ where: { id: 'photo-1' } });
      expect(result).toEqual(mockPhoto);
    });
  });
});
