import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CompanyAuthController } from './company-auth.controller';
import { CompanyAuthService } from './company-auth.service';
import { AtStrategy, RtStrategy } from '../../common/strategies';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CompanyAuthController],
  providers: [CompanyAuthService, AtStrategy, RtStrategy],
  exports: [CompanyAuthService],
})
export class CompanyAuthModule {}
