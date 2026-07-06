import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(String(createUserDto.password), 10);
    const data = {
      email: String(createUserDto.email).trim(),
      username: String(createUserDto.username).trim(),
      password: hashedPassword,
    };
    try {
      return await this.prisma.user.create({ data });
    } catch (err: unknown) {
      console.error('[UsersService.create]', err);
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
      if (code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cet email ou ce nom d\'utilisateur.');
      }
      throw err;
    }
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: updateUserDto });
  }

  remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async searchUsers(query?: string) {
    if (!query || query.trim().length < 1) return [];
    return this.prisma.user.findMany({
      where: { username: { contains: query.trim(), mode: 'insensitive' } },
      select: { id: true, username: true, avatarUrl: true },
      take: 10,
      orderBy: { username: 'asc' },
    });
  }

  async toggleFollow(currentUserId: string, targetId: string) {
    if (currentUserId === targetId) {
      throw new ConflictException('Vous ne pouvez pas vous suivre vous-même.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        username: true,
        isPrivate: true,
        followers: { where: { id: currentUserId }, select: { id: true } },
      },
    });
    if (!target) throw new NotFoundException('Utilisateur introuvable.');

    const alreadyFollowing = target.followers.length > 0;

    if (alreadyFollowing) {
      await this.prisma.user.update({
        where: { id: targetId },
        data: { followers: { disconnect: { id: currentUserId } } },
      });
      return { status: 'unfollowed' as const };
    }

    if (target.isPrivate) {
      const existing = await this.prisma.followRequest.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetId } },
      });

      if (existing) {
        await this.prisma.followRequest.delete({ where: { id: existing.id } });
        return { status: 'request_cancelled' as const };
      }

      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { username: true },
      });

      await this.prisma.followRequest.create({
        data: { followerId: currentUserId, followingId: targetId },
      });

      await this.prisma.notification.create({
        data: {
          userId: targetId,
          type: 'FOLLOW_REQUEST',
          message: `${currentUser?.username ?? 'Quelqu\'un'} souhaite vous suivre.`,
          relatedId: currentUserId,
        },
      });

      return { status: 'requested' as const };
    }

    await this.prisma.user.update({
      where: { id: targetId },
      data: { followers: { connect: { id: currentUserId } } },
    });
    return { status: 'following' as const };
  }

  async getFollowRequests(userId: string) {
    return this.prisma.followRequest.findMany({
      where: { followingId: userId, status: 'PENDING' },
      include: {
        follower: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptFollowRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
      include: { following: { select: { username: true } } },
    });

    if (!request || request.followingId !== currentUserId) {
      throw new NotFoundException('Demande introuvable.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: currentUserId },
        data: { followers: { connect: { id: request.followerId } } },
      }),
      this.prisma.followRequest.delete({ where: { id: requestId } }),
      this.prisma.notification.create({
        data: {
          userId: request.followerId,
          type: 'FOLLOW_ACCEPTED',
          message: `${request.following.username} a accepté votre demande d'abonnement.`,
          relatedId: currentUserId,
        },
      }),
    ]);

    return { accepted: true };
  }

  async declineFollowRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.followingId !== currentUserId) {
      throw new NotFoundException('Demande introuvable.');
    }

    await this.prisma.followRequest.delete({ where: { id: requestId } });

    return { declined: true };
  }

  async getProfile(targetId: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isPrivate: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, photos: true } },
        followers: currentUserId
          ? { where: { id: currentUserId }, select: { id: true } }
          : false,
        photos: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            _count: { select: { reviews: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const isOwner = currentUserId === targetId;
    const isFollower = Array.isArray(user.followers) && user.followers.length > 0;
    const canSeeContent = !user.isPrivate || isOwner || isFollower;

    let hasPendingRequest = false;
    if (currentUserId && !isOwner && !isFollower && user.isPrivate) {
      const pending = await this.prisma.followRequest.findUnique({
        where: {
          followerId_followingId: { followerId: currentUserId, followingId: targetId },
          status: 'PENDING',
        },
      });
      hasPendingRequest = !!pending;
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isPrivate: user.isPrivate,
      createdAt: user.createdAt,
      _count: user._count,
      isFollowing: isFollower,
      hasPendingRequest,
      isOwner,
      photos: canSeeContent ? user.photos : [],
    };
  }

  async updateSettings(userId: string, data: { bio?: string; avatarUrl?: string; isPrivate?: boolean }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        isPrivate: true,
      },
    });
  }
}
