import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('stream')
  @Sse()
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) throw new UnauthorizedException();
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      }) as { sub: string };
      return this.notificationsService.getStream(payload.sub);
    } catch {
      throw new UnauthorizedException();
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.findAllForUser(user.id);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.countUnread(user.id);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  markOneRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.markOneRead(id, user.id);
  }
}
