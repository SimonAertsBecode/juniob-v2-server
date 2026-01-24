import { Module } from '@nestjs/common';
import { CompanyAuthModule } from './auth/company-auth.module';
import { CreditModule } from './credits/credit.module';
import { InvitationModule } from './invitations/invitation.module';
import { ReportModule } from './reports/report.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { ProfileModule } from './profile/profile.module';
import { TagModule } from './tags/tag.module';

@Module({
  imports: [
    CompanyAuthModule,
    CreditModule,
    InvitationModule,
    ReportModule,
    PipelineModule,
    ProfileModule,
    TagModule,
  ],
  exports: [
    CompanyAuthModule,
    CreditModule,
    InvitationModule,
    ReportModule,
    PipelineModule,
    ProfileModule,
    TagModule,
  ],
})
export class CompanyModule {}
