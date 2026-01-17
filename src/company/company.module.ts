import { Module } from '@nestjs/common';
import { CompanyAuthModule } from './auth/company-auth.module';
import { CreditModule } from './credits/credit.module';
import { InvitationModule } from './invitations/invitation.module';
import { ReportModule } from './reports/report.module';

@Module({
  imports: [CompanyAuthModule, CreditModule, InvitationModule, ReportModule],
  exports: [CompanyAuthModule, CreditModule, InvitationModule, ReportModule],
})
export class CompanyModule {}
