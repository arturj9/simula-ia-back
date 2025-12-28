import { Test, TestingModule } from '@nestjs/testing';
import { DocxService } from './docx.service';
import { Packer } from 'docx';

jest.mock('docx', () => {
  const originalModule = jest.requireActual('docx');
  return {
    ...originalModule,
    Packer: {
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-docx')),
    },
  };
});

describe('DocxService', () => {
  let service: DocxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocxService],
    }).compile();

    service = module.get<DocxService>(DocxService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve gerar DOCX com questão DISCURSIVA', async () => {
    const mockExam = {
      title: 'Prova Discursiva',
      questions: [
        {
          question: {
            statement: 'Pergunta 1',
            type: 'DISCURSIVE',
            alternatives: [],
          },
        },
      ],
    };

    const buffer = await service.generateExamDocx(mockExam as any);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(Packer.toBuffer).toHaveBeenCalled();
  });

  it('deve gerar DOCX com questões OBJETIVA, TRUE_FALSE e DRAWING', async () => {
    const mockExam = {
      title: 'Prova Mista',
      description: 'Teste completo',
      questions: [
        {
          question: {
            statement: 'Questão Obj',
            type: 'OBJECTIVE',
            alternatives: [{ text: 'A' }, { text: 'B' }],
          },
        },
        {
          question: {
            statement: 'Questão V/F',
            type: 'TRUE_FALSE',
            alternatives: [{ text: 'V' }, { text: 'F' }],
          },
        },
        {
          question: {
            statement: 'Questão Desenho',
            type: 'DRAWING',
            alternatives: [],
          },
        },
      ],
    };

    const buffer = await service.generateExamDocx(mockExam as any);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(Packer.toBuffer).toHaveBeenCalled();
  });
});
