import { Test, TestingModule } from '@nestjs/testing';
import { AnnotationsService } from './annotations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnnotationsService', () => {
  let service: AnnotationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnnotationsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<AnnotationsService>(AnnotationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
