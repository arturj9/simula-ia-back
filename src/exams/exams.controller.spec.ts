import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { BadRequestException } from '@nestjs/common';
import { PdfService } from '../export/pdf.service';
import { DocxService } from '../export/docx.service';
import { Response } from 'express';

describe('ExamsController', () => {
  let controller: ExamsController;
  let service: ExamsService;
  let pdfService: PdfService;
  let docxService: DocxService;

  const mockRes = {
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findMyExams: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    previewAiGeneration: jest.fn(),
  };

  const mockPdfService = {
    generateExamPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
  };

  const mockDocxService = {
    generateExamDocx: jest.fn().mockResolvedValue(Buffer.from('docx-content')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [
        { provide: ExamsService, useValue: mockService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: DocxService, useValue: mockDocxService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ExamsController>(ExamsController);
    service = module.get<ExamsService>(ExamsService);
    pdfService = module.get<PdfService>(PdfService);
    docxService = module.get<DocxService>(DocxService);
  });

  describe('create', () => {
    it('deve chamar create', async () => {
      const dto = { title: 'Prova' } as any;
      await controller.create({ user: { sub: 'u1' } } as any, dto);
      expect(service.create).toHaveBeenCalledWith('u1', dto);
    });
  });

  describe('previewGeneration', () => {
    it('deve chamar previewAiGeneration', async () => {
      const config = { useAI: true, items: [] } as any;
      await controller.previewGeneration(config);
      expect(service.previewAiGeneration).toHaveBeenCalledWith(config);
    });

    it('deve falhar se config for nula', async () => {
      await expect(controller.previewGeneration(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Queries (findAll, findOne, findMyExams)', () => {
    it('findAll', async () => {
      await controller.findAll({ page: 1 } as any);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('findOne', async () => {
      await controller.findOne('id');
      expect(service.findOne).toHaveBeenCalledWith('id');
    });

    it('findMyExams', async () => {
      const req = { user: { sub: 'user-1' } } as any;
      const query = { page: 1 } as any;
      await controller.findMyExams(req, query);
      expect(service.findMyExams).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('Updates & Deletes', () => {
    it('update', async () => {
      await controller.update({ user: { sub: 'u1' } } as any, 'id', {} as any);
      expect(service.update).toHaveBeenCalled();
    });

    it('remove', async () => {
      await controller.remove({ user: { sub: 'u1' } } as any, 'id');
      expect(service.remove).toHaveBeenCalled();
    });
  });

  describe('downloadExam', () => {
    const mockExamData = {
      title: 'Prova Teste',
      description: 'Desc',
      discipline: { name: 'Matemática' },
      creator: { name: 'Professor' },
      questions: [],
    };

    it('deve baixar PDF por padrão (formato não especificado)', async () => {
      mockService.findOne.mockResolvedValue(mockExamData);

      await controller.downloadExam('uuid-1', undefined as any, mockRes);

      expect(service.findOne).toHaveBeenCalledWith('uuid-1');
      expect(pdfService.generateExamPdf).toHaveBeenCalled();

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': expect.stringContaining('.pdf'),
        }),
      );
      expect(mockRes.end).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('deve baixar DOCX quando solicitado', async () => {
      mockService.findOne.mockResolvedValue(mockExamData);

      await controller.downloadExam('uuid-1', 'docx', mockRes);

      expect(service.findOne).toHaveBeenCalledWith('uuid-1');
      expect(docxService.generateExamDocx).toHaveBeenCalled();

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': expect.stringContaining('wordprocessingml'),
          'Content-Disposition': expect.stringContaining('.docx'),
        }),
      );
      expect(mockRes.end).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('deve normalizar alternativas nulas, strings ou números ao gerar arquivo', async () => {
      const mockExamEdgeCases = {
        id: '123',
        title: 'Prova Edge Case',
        questions: [
          {
            question: {
              statement: 'Questão sem alternativas (null)',
              type: 'DISCURSIVE',
              alternatives: null,
            },
          },
          {
            question: {
              statement: 'Questão com alternativas primitivas',
              type: 'OBJECTIVE',
              alternatives: ['Opção A', 10, { text: 'Opção C' }],
            },
          },
        ],
      };

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockExamEdgeCases as any);

      const mockBuffer = Buffer.from('fake-docx');
      jest.spyOn(docxService, 'generateExamDocx').mockResolvedValue(mockBuffer);

      const mockRes = {
        set: jest.fn(),
        end: jest.fn(),
      } as unknown as any;

      await controller.downloadExam('123', 'docx', mockRes);

      expect(docxService.generateExamDocx).toHaveBeenCalledWith(
        expect.objectContaining({
          questions: [
            expect.objectContaining({
              question: expect.objectContaining({
                statement: 'Questão sem alternativas (null)',
                alternatives: [],
              }),
            }),
            expect.objectContaining({
              question: expect.objectContaining({
                statement: 'Questão com alternativas primitivas',
                alternatives: [
                  { text: 'Opção A' },
                  { text: '10' },
                  { text: 'Opção C' },
                ],
              }),
            }),
          ],
        }),
      );
    });
  });
});
