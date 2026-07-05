import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  providers: [LocalStorageService, SupabaseStorageService],
  exports: [LocalStorageService, SupabaseStorageService],
})
export class StorageModule {}
