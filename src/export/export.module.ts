import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { DocxService } from './docx.service';

@Module({
  providers: [PdfService, DocxService],
  exports: [PdfService, DocxService],
})
export class ExportModule {}
