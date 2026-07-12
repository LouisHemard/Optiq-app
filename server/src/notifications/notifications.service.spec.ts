import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'follow_request',
  message: 'alice vous a envoyé une demande',
  isRead: false,
  createdAt: new Date(),
};

const makePrisma = () => ({
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForUser', () => {
    it('retourne les notifications de l\'utilisateur triées par date', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.findAllForUser('user-1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockNotification);
    });

    it('retourne un tableau vide si aucune notification', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.findAllForUser('user-2');

      expect(result).toEqual([]);
    });
  });

  describe('countUnread', () => {
    it('retourne le nombre de notifications non lues', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.countUnread('user-1');

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(result).toBe(3);
    });

    it('retourne 0 si tout est lu', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.countUnread('user-1');

      expect(result).toBe(0);
    });
  });

  describe('markAllRead', () => {
    it('marque toutes les notifications comme lues et retourne success', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markAllRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('markOneRead', () => {
    it('marque une notification spécifique comme lue', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markOneRead('notif-1', 'user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
