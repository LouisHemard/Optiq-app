import { SupabaseStorageService } from './supabase-storage.service';

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}));

const makeFile = (): Express.Multer.File =>
  ({
    originalname: 'photo.jpg',
    buffer: Buffer.from('image-data'),
    mimetype: 'image/jpeg',
  }) as Express.Multer.File;

describe('SupabaseStorageService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('isConfigured', () => {
    it("retourne false si les variables d'env Supabase sont absentes", () => {
      const service = new SupabaseStorageService();
      expect(service.isConfigured()).toBe(false);
    });

    it('retourne true si SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis', () => {
      process.env.SUPABASE_URL = 'https://proj.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

      const service = new SupabaseStorageService();
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('save', () => {
    it("lève une erreur si Supabase n'est pas configuré", async () => {
      const service = new SupabaseStorageService();
      await expect(service.save(makeFile())).rejects.toThrow(
        'Supabase Storage non configuré',
      );
    });

    it("retourne l'URL publique après upload réussi", async () => {
      process.env.SUPABASE_URL = 'https://proj.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

      mockUpload.mockResolvedValue({ data: { path: 'uuid.jpg' }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://proj.supabase.co/storage/v1/object/public/photos/uuid.jpg' },
      });

      const service = new SupabaseStorageService();
      const result = await service.save(makeFile());

      expect(mockUpload).toHaveBeenCalled();
      expect(result).toContain('supabase.co');
    });

    it("lève une erreur si Supabase retourne une erreur d'upload", async () => {
      process.env.SUPABASE_URL = 'https://proj.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

      mockUpload.mockResolvedValue({ data: null, error: { message: 'quota dépassé' } });

      const service = new SupabaseStorageService();
      await expect(service.save(makeFile())).rejects.toThrow('quota dépassé');
    });
  });
});
