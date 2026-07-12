import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../auth/jwt-auth-optional.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto.token, dto.newPassword);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  searchUsers(@Query('q') q: string) {
    return this.usersService.searchUsers(q);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(user.id, dto);
  }

  @Post('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.deleteMe(user.id);
  }

  @Get('me/follow-requests')
  @UseGuards(JwtAuthGuard)
  getFollowRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getFollowRequests(user.id);
  }

  @Post('follow-requests/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  acceptFollowRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.acceptFollowRequest(requestId, user.id);
  }

  @Post('follow-requests/:requestId/decline')
  @UseGuards(JwtAuthGuard)
  declineFollowRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.declineFollowRequest(requestId, user.id);
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthOptionalGuard)
  getProfile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload | null,
  ) {
    return this.usersService.getProfile(id, user?.id);
  }

  @Post(':targetId/follow')
  @UseGuards(JwtAuthGuard)
  toggleFollow(
    @Param('targetId') targetId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.toggleFollow(user.id, targetId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
