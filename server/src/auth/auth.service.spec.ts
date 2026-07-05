import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const fakeUser = {
    id: 'user-uuid-123',
    email: 'alice@example.com',
    username: 'alice',
    password: '$2b$10$fakehashedpassword',
    avatarUrl: 'https://cdn/avatar.jpg',
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('login', () => {
    it('retourne un access_token et le user quand les identifiants sont valides', async () => {
      usersService.findByEmail.mockResolvedValue(fakeUser);
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));
      jwtService.sign.mockReturnValue('signed.jwt.token');

      const result = await authService.login('alice@example.com', 'goodpassword');

      expect(usersService.findByEmail).toHaveBeenCalledWith('alice@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('goodpassword', fakeUser.password);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: fakeUser.id,
        username: fakeUser.username,
      });

      expect(result).toEqual({
        access_token: 'signed.jwt.token',
        user: {
          id: fakeUser.id,
          email: fakeUser.email,
          username: fakeUser.username,
          avatarUrl: fakeUser.avatarUrl,
        },
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it("lève UnauthorizedException quand l'utilisateur n'existe pas", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('inconnu@example.com', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        authService.login('inconnu@example.com', 'whatever'),
      ).rejects.toThrow('Email ou mot de passe incorrect.');

      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('lève UnauthorizedException quand le mot de passe est incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(fakeUser);
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(false));

      await expect(
        authService.login('alice@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrongpassword', fakeUser.password);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('utilise le bon payload JWT (sub + username) sans inclure le mot de passe', async () => {
      usersService.findByEmail.mockResolvedValue(fakeUser);
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));
      jwtService.sign.mockReturnValue('any.token');

      await authService.login(fakeUser.email, 'goodpassword');

      const payloadArg = jwtService.sign.mock.calls[0][0];
      expect(payloadArg).toEqual({
        sub: fakeUser.id,
        username: fakeUser.username,
      });
      expect(payloadArg).not.toHaveProperty('password');
      expect(payloadArg).not.toHaveProperty('email');
    });

    it("propage l'erreur si UsersService échoue (ex: base de données indisponible)", async () => {
      const dbError = new Error('Database connection refused');
      usersService.findByEmail.mockRejectedValue(dbError);

      await expect(
        authService.login('alice@example.com', 'goodpassword'),
      ).rejects.toThrow('Database connection refused');

      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
