/* eslint-disable */

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ExportExamData } from './export.interfaces';

@Injectable()
export class PdfService {
  async generateExamPdf(exam: ExportExamData): Promise<Buffer> {
    const { title, description, discipline, creator, questions } = exam;
    const disciplineName = discipline?.name || 'Geral';
    const creatorName = creator?.name || 'N/A';

    const pdfBuffer: Buffer = await new Promise((resolve) => {
      const doc: typeof PDFDocument = new PDFDocument({
        size: 'LETTER',
        bufferPages: true,
      });

      const buffer: Buffer[] = [];

      doc.on('data', (chunk: any) => buffer.push(chunk as Buffer));

      doc.on('end', () => {
        const data = Buffer.concat(buffer);
        resolve(data);
      });

      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();

      if (description) {
        doc.fontSize(12).text(description, { align: 'left' });
        doc.moveDown();
      }

      doc.fontSize(12).text(`Disciplina: ${disciplineName}`, {
        align: 'left',
      });

      doc.fontSize(12).text(`Professor: ${creatorName}`, { align: 'left' });

      doc.moveDown();

      questions.forEach((item, index) => {
        const q = item.question;
        doc.fontSize(12).text(`${index + 1}) ${q.statement}`);
        doc.moveDown(0.5);

        if (q.type === 'OBJECTIVE' || q.type === 'TRUE_FALSE') {
          q.alternatives.forEach((alt, i) => {
            doc.text(`${String.fromCharCode(97 + i)}) ${alt.text}`);
          });
        } else if (q.type === 'DISCURSIVE') {
          doc.moveDown();
          for (let i = 0; i < 5; i++) {
            doc.text(
              '_____________________________________________________________________',
              { align: 'left' },
            );
            doc.moveDown(0.3);
          }
        } else if (q.type === 'DRAWING') {
          doc.rect(doc.x, doc.y, 400, 150).stroke();
          doc.moveDown(10);
        }

        doc.moveDown();
      });

      doc.end();
    });

    return pdfBuffer;
  }
}
