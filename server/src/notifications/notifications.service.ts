import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private streams = new Map<string, Subject<MessageEvent>>();

  getStream(userId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.streams.set(userId, subject);
    return subject.asObservable().pipe(
      finalize(() => {
        this.streams.delete(userId);
      }),
    );
  }

  emit(userId: string, data: object) {
    this.streams.get(userId)?.next({ data } as MessageEvent);
  }

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markOneRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }
}
