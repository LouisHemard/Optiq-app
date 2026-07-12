import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from './local-storage.service';

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-1234'),
}));

const makeFile = (name: string): Express.Multer.File =>
  ({
    originalname: name,
    buffer: Buffer.from('image-data'),
    mimetype: 'image/jpeg',
  }) as Express.Multer.File;

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorageService],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('save', () => {
    it('retourne une URL avec l\'extension .jpg pour un fichier JPEG', () => {
      const result = service.save(makeFile('photo.jpg'));
      expect(result).toContain('test-uuid-1234.jpg');
      expect(result).toContain('/uploads/');
    });

    it('retourne une URL avec l\'extension .png pour un fichier PNG', () => {
      const result = service.save(makeFile('image.png'));
      expect(result).toContain('test-uuid-1234.png');
    });

    it('retourne une URL avec l\'extension .webp pour un fichier WebP', () => {
      const result = service.save(makeFile('shot.webp'));
      expect(result).toContain('test-uuid-1234.webp');
    });

    it('retourne .jpg par défaut si l\'extension est inconnue', () => {
      const result = service.save(makeFile('photo.bmp'));
      expect(result).toContain('test-uuid-1234.jpg');
    });

    it('retourne .jpg par défaut si le fichier n\'a pas d\'extension', () => {
      const result = service.save(makeFile('photo'));
      expect(result).toContain('test-uuid-1234.jpg');
    });

    it('écrit le fichier sur le disque', () => {
      const { writeFileSync } = jest.requireMock('fs') as { writeFileSync: jest.Mock };
      writeFileSync.mockClear();

      service.save(makeFile('test.jpg'));

      expect(writeFileSync).toHaveBeenCalledTimes(1);
    });
  });
});
