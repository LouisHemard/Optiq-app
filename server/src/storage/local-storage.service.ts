import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = 'uploads';
const MAX_FILENAME_LENGTH = 200;

@Injectable()
export class LocalStorageService {
  private readonly uploadsPath: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadsPath = join(process.cwd(), UPLOADS_DIR);
    this.baseUrl =
      process.env.APP_URL || `http://localhost:${process.env.PORT || 3002}`;
    mkdirSync(this.uploadsPath, { recursive: true });
  }

  save(file: Express.Multer.File): string {
    const ext = this.getExtension(file.originalname) || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(this.uploadsPath, filename);
    writeFileSync(filepath, file.buffer);
    return `${this.baseUrl}/${UPLOADS_DIR}/${filename}`;
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
