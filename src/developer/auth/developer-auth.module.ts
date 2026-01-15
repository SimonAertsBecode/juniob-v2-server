import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DeveloperAuthController } from './developer-auth.controller';
import { DeveloperAuthService } from './developer-auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [DeveloperAuthController],
  providers: [DeveloperAuthService],
  exports: [DeveloperAuthService],
})
export class DeveloperAuthModule {}
