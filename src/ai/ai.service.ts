import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateQuestionDto } from './dto/generate-question.dto';

export interface AIResponse {
  statement: string;
  correctAnswer: string;
  alternatives: { text: string }[];
  explanation: string;
}

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY não configurada no .env',
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateQuestion(dto: GenerateQuestionDto): Promise<AIResponse> {
    let baseQuestionsContext = '';

    if (dto.baseQuestionIds && dto.baseQuestionIds.length > 0) {
      const baseQuestions = await this.prisma.question.findMany({
        where: { id: { in: dto.baseQuestionIds } },
        select: { statement: true, correctAnswer: true },
      });

      if (baseQuestions.length !== dto.baseQuestionIds.length) {
        throw new NotFoundException(
          'Algumas questões base fornecidas não foram encontradas.',
        );
      }

      baseQuestionsContext = `
      --- QUESTÕES DE REFERÊNCIA (INSPIRAÇÃO) ---
      Use estas questões como base para estilo e dificuldade:
      ${baseQuestions
        .map(
          (q, i) =>
            `${i + 1}) Enunciado: ${q.statement}\n   Resposta: ${q.correctAnswer}`,
        )
        .join('\n')}
      -------------------------------------------
      `;
    }

    const prompt = this.buildPrompt(dto, baseQuestionsContext);

    return this.callGeminiApiWithRetry(prompt);
  }

  private buildPrompt(
    dto: GenerateQuestionDto,
    baseQuestionsContext: string,
  ): string {
    let typeRules = '';

    if (dto.type === 'OBJECTIVE') {
      typeRules =
        'O JSON DEVE ter um campo "alternatives" com um array de 5 objetos';
    } else if (dto.type === 'TRUE_FALSE') {
      typeRules =
        'O JSON DEVE ter um campo "alternatives" com exatamente 2 objetos';
    } else if (dto.type === 'DISCURSIVE') {
      typeRules = 'O campo "alternatives" DEVE ser um array vazio []';
    } else if (dto.type === 'DRAWING') {
      typeRules = 'O campo "alternatives" DEVE ser um array vazio []';
    }

    const generalContext = dto.generalContext
      ? `DIRETRIZES GERAIS DO PROFESSOR: "${dto.generalContext}"`
      : '';

    return `
      Você é um professor especialista criando uma questão de prova.
      
      Tópico: ${dto.topic}
      Dificuldade: ${dto.difficulty}
      Tipo: ${dto.type}
      
      ${generalContext}
      ${baseQuestionsContext}
      ${typeRules}

      Gere APENAS um objeto JSON válido (sem markdown, sem \`\`\`) com a seguinte estrutura:
      {
        "statement": "Enunciado da questão",
        "correctAnswer": "A resposta correta",
        "alternatives": [
          {"text": "Alternativa A"},
          {"text": "Alternativa B"},
          {"text": "Alternativa C"},
          {"text": "Alternativa D"}
        ],
        "explanation": "Explicação breve de por que a resposta está correta"
      }
    `;
  }

  private async callGeminiApiWithRetry(
    prompt: string,
    retries = 3,
  ): Promise<AIResponse> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const cleanText = text
          .replaceAll('```json', '')
          .replaceAll('```', '')
          .trim();

        return JSON.parse(cleanText) as AIResponse;
      } catch (error: unknown) {
        attempt++;

        let isRateLimit = false;
        if (error && typeof error === 'object' && 'status' in error) {
          const err = error as { status: number };
          if (err.status === 429) {
            isRateLimit = true;
          }
        }

        if (isRateLimit && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new InternalServerErrorException('Erro inesperado na IA.');
  }
}
