import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const MAX_FILENAME_LENGTH = 200;

@Injectable()
export class SupabaseStorageService {
  private readonly client: SupabaseClient | null = null;
  private readonly bucket: string;
  private readonly supabaseUrl: string | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const bucket = process.env.SUPABASE_BUCKET?.trim();
    this.bucket = bucket || 'photos';
    if (url && key) {
      this.client = createClient(url, key);
      this.supabaseUrl = url;
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  isSupabaseUrl(url: string): boolean {
    return !!this.supabaseUrl && url.startsWith(this.supabaseUrl);
  }

  extractPath(publicUrl: string): string | null {
    const marker = `/object/public/${this.bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  }

  async createSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data) return null;
    return data.signedUrl;
  }

  async save(file: Express.Multer.File): Promise<string> {
    if (!this.client) {
      throw new Error(
        'Supabase Storage non configuré (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)',
      );
    }
    const ext = this.getExtension(file.originalname) || '.jpg';
    const path = `${randomUUID()}${ext}`;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false,
      });
    if (error) {
      throw new Error(`Supabase upload: ${error.message}`);
    }
    const { data: urlData } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  private getExtension(originalname: string): string | null {
    if (!originalname || typeof originalname !== 'string') return null;
    const name = originalname.slice(-MAX_FILENAME_LENGTH);
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) return null;
    const ext = name.slice(lastDot).toLowerCase();
    return /^\.(jpe?g|png|gif|webp|heic)$/.test(ext) ? ext : null;
  }
}
