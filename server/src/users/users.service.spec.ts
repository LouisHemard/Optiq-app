import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  username: 'alice',
  password: '$2b$10$hashed',
  avatarUrl: null,
  bio: null,
  isPrivate: false,
  createdAt: new Date(),
};

const makePrisma = () => ({
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  followRequest: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée un utilisateur avec succès', async () => {
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'alice@example.com',
        username: 'alice',
        password: 'motdepasse123',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('lève ConflictException si email/username déjà pris (P2002)', async () => {
      const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      prisma.user.create.mockRejectedValue(err);

      await expect(
        service.create({ email: 'alice@example.com', username: 'alice', password: '123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('propage les autres erreurs Prisma', async () => {
      prisma.user.create.mockRejectedValue(new Error('DB timeout'));

      await expect(
        service.create({ email: 'a@b.com', username: 'a', password: '123' }),
      ).rejects.toThrow('DB timeout');
    });
  });

  describe('findAll', () => {
    it('retourne tous les utilisateurs', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('retourne un utilisateur par id', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      const result = await service.findOne('user-1');
      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('retourne un utilisateur par email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findByEmail('alice@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
      expect(result).toEqual(mockUser);
    });

    it('retourne null si email inconnu', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('inconnu@example.com');
      expect(result).toBeNull();
    });
  });

  describe('searchUsers', () => {
    it('retourne une liste vide si la query est vide', async () => {
      const result = await service.searchUsers('');
      expect(result).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('retourne une liste vide si query undefined', async () => {
      const result = await service.searchUsers(undefined);
      expect(result).toEqual([]);
    });

    it('recherche les utilisateurs par username', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.searchUsers('ali');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: expect.objectContaining({ contains: 'ali' }) },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('toggleFollow', () => {
    it('lève ConflictException si on tente de se suivre soi-même', async () => {
      await expect(service.toggleFollow('user-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('se désabonne si déjà abonné', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: 'user-2',
        isPrivate: false,
        followers: [{ id: 'user-1' }],
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.toggleFollow('user-1', 'user-2');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { followers: { disconnect: { id: 'user-1' } } },
        }),
      );
      expect(result).toEqual({ status: 'unfollowed' });
    });

    it("s'abonne si compte public et pas encore abonné", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: 'user-2',
        isPrivate: false,
        followers: [],
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.toggleFollow('user-1', 'user-2');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { followers: { connect: { id: 'user-1' } } },
        }),
      );
      expect(result).toEqual({ status: 'following' });
    });

    it('envoie une demande si compte privé et pas encore de demande', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ ...mockUser, id: 'user-2', isPrivate: true, followers: [] })
        .mockResolvedValueOnce({ ...mockUser, id: 'user-1', username: 'alice' });
      prisma.followRequest.findUnique.mockResolvedValue(null);
      prisma.followRequest.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.toggleFollow('user-1', 'user-2');

      expect(prisma.followRequest.create).toHaveBeenCalled();
      expect(result).toEqual({ status: 'requested' });
    });

    it('lève NotFoundException si utilisateur cible inexistant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleFollow('user-1', 'user-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSettings', () => {
    it('met à jour les paramètres du profil', async () => {
      const updatedUser = { ...mockUser, bio: 'Photographe amateur', isPrivate: true };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateSettings('user-1', { bio: 'Photographe amateur', isPrivate: true });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { bio: 'Photographe amateur', isPrivate: true },
        }),
      );
      expect(result.bio).toBe('Photographe amateur');
    });
  });
});
