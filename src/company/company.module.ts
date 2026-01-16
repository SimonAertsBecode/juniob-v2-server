import { Module } from '@nestjs/common';
import { CompanyAuthModule } from './auth/company-auth.module';
import { CreditModule } from './credits/credit.module';
import { InvitationModule } from './invitations/invitation.module';

@Module({
  imports: [CompanyAuthModule, CreditModule, InvitationModule],
  exports: [CompanyAuthModule, CreditModule, InvitationModule],
})
export class CompanyModule {}
