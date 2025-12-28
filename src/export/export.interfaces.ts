import { QuestionType } from '@prisma/client';

export interface ExportAlternative {
  text: string;
}

export interface ExportQuestionItem {
  statement: string;
  type: QuestionType;
  alternatives: ExportAlternative[];
}

export interface ExportQuestionWrapper {
  question: ExportQuestionItem;
}

export interface ExportExamData {
  title: string;
  description?: string | null;
  discipline?: { name: string } | null;
  creator?: { name: string } | null;
  questions: ExportQuestionWrapper[];
}
