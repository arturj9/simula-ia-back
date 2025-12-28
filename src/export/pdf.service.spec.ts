import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import { ExportExamData } from './export.interfaces';

// --- PASSO 1: Criar os Spies Globais ---
// É OBRIGATÓRIO começar o nome da variável com 'mock' para o Jest aceitar usá-las dentro do jest.mock
const mockText = jest.fn().mockReturnThis();
const mockFontSize = jest.fn().mockReturnThis();
const mockMoveDown = jest.fn().mockReturnThis();
const mockRect = jest.fn().mockReturnThis();
const mockStroke = jest.fn().mockReturnThis();
const mockEnd = jest.fn();
const mockOn = jest.fn();
// Adicionei estes pois o PDFKit geralmente quebra sem eles
const mockPipe = jest.fn();
const mockFont = jest.fn().mockReturnThis();

// --- PASSO 2: Fazer o Mock do Módulo ---
// Aqui nós montamos o objeto manualmente DENTRO da fábrica
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: mockOn,
      end: mockEnd,
      fontSize: mockFontSize,
      font: mockFont,
      text: mockText,
      moveDown: mockMoveDown,
      rect: mockRect,
      stroke: mockStroke,
      pipe: mockPipe,
      x: 100, // Valores dummy para propriedades
      y: 100,
    };
  });
});

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    // Limpa o contador de chamadas antes de cada teste
    jest.clearAllMocks();

    // Configuração CRÍTICA: Simular o evento 'end' para que a Promise do service resolva
    mockOn.mockImplementation((event, callback) => {
      if (event === 'end') {
        callback(); // Executa o callback imediatamente
      }
      // Retornamos 'this' ou um objeto vazio para manter o encadeamento se necessário
      return {};
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve gerar PDF com questões OBJETIVA e DRAWING', async () => {
    const mockExam: ExportExamData = {
      title: 'Prova Teste',
      description: 'Descrição da prova',
      discipline: { name: 'Math' },
      creator: { name: 'Prof' },
      questions: [
        {
          question: {
            statement: 'Quanto é 1+1?',
            type: 'OBJECTIVE', // Certifique-se que bate com seu Enum
            alternatives: [{ text: '2' }],
          },
        },
        {
          question: {
            statement: 'Desenhe um círculo',
            type: 'DRAWING',
            alternatives: [],
          },
        },
      ],
    };

    // A chamada deve funcionar agora porque mockOn('end') chama o callback
    const buffer = await service.generateExamPdf(mockExam);

    // Validações
    expect(buffer).toBeDefined(); // Se retornar void, remova esta linha

    // Verifica chamadas
    expect(mockText).toHaveBeenCalledWith(mockExam.title, expect.anything());

    if (mockExam.description) {
      expect(mockText).toHaveBeenCalledWith(
        mockExam.description,
        expect.anything(),
      );
    }

    // Verifica se desenhou o retângulo (usado em questões de desenho)
    expect(mockRect).toHaveBeenCalled();
  });

  it('deve gerar PDF com questão DISCURSIVA e SEM descrição', async () => {
    const mockExam: ExportExamData = {
      title: 'Prova Escrita',
      description: null,
      discipline: null,
      creator: null,
      questions: [
        {
          question: {
            statement: 'Discorra sobre o universo.',
            type: 'DISCURSIVE',
            alternatives: [],
          },
        },
      ],
    };

    await service.generateExamPdf(mockExam);

    expect(mockText).toHaveBeenCalledWith('Prova Escrita', expect.anything());

    // Regex para verificar se linhas sublinhadas foram criadas
    expect(mockText).toHaveBeenCalledWith(
      expect.stringMatching(/_+/),
      expect.anything(),
    );
  });
});
