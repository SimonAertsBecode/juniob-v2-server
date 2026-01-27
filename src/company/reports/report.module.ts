import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportPdfService } from './report-pdf.service';
import { CreditModule } from '../credits/credit.module';

@Module({
  imports: [CreditModule],
  controllers: [ReportController],
  providers: [ReportService, ReportPdfService],
  exports: [ReportService],
})
export class ReportModule {}
