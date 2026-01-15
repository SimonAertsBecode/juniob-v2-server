import { Module } from '@nestjs/common';
import { CompanyAuthModule } from './auth/company-auth.module';

@Module({
  imports: [CompanyAuthModule],
  exports: [CompanyAuthModule],
})
export class CompanyModule {}
