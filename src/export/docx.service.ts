/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import {
  ExportExamData,
  ExportQuestionWrapper,
  ExportAlternative,
} from './export.interfaces';

@Injectable()
export class DocxService {
  async generateExamDocx(exam: ExportExamData): Promise<Buffer> {
    const questions: ExportQuestionWrapper[] = exam.questions;

    const questionParagraphs: Paragraph[] = questions.flatMap(
      (item: ExportQuestionWrapper, index: number): Paragraph[] => {
        const q = item.question;
        const elements: Paragraph[] = [];

        elements.push(
          new Paragraph({
            text: `Questão ${index + 1}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: q.statement, size: 24 })],
            spacing: { after: 200 },
          }),
        );

        if (q.type === 'OBJECTIVE' || q.type === 'TRUE_FALSE') {
          const alts: ExportAlternative[] = q.alternatives;
          alts.forEach((alt: ExportAlternative, i: number) => {
            const letter = String.fromCharCode(65 + i);
            elements.push(
              new Paragraph({
                text: `${letter}) ${alt.text}`,
                indent: { left: 720 },
                spacing: { after: 100 },
              }),
            );
          });
        } else if (q.type === 'DISCURSIVE') {
          elements.push(
            new Paragraph({ text: '_'.repeat(75), spacing: { before: 200 } }),
            new Paragraph({ text: '_'.repeat(75), spacing: { before: 200 } }),
            new Paragraph({ text: '_'.repeat(75), spacing: { before: 200 } }),
          );
        } else if (q.type === 'DRAWING') {
          elements.push(
            new Paragraph({
              text: '',
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
                left: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
                right: { style: BorderStyle.SINGLE, size: 6, color: 'auto' },
              },
              spacing: {
                before: 300,
                after: 3000,
              },
            }),
          );
        }
        return elements;
      },
    );

    const disciplineName: string = exam.discipline?.name ?? 'Geral';
    const creatorName: string = exam.creator?.name ?? 'N/A';
    const description: string = exam.description ?? '';

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: exam.title,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Disciplina: ${disciplineName}  |  Professor: ${creatorName}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              border: {
                bottom: {
                  color: 'auto',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
            }),
            new Paragraph({
              text: description,
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 400 },
            }),
            ...questionParagraphs,
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }
}
