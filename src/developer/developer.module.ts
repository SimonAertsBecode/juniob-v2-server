import { Module } from '@nestjs/common';
import { DeveloperAuthModule } from './auth/developer-auth.module';

@Module({
  imports: [DeveloperAuthModule],
  exports: [DeveloperAuthModule],
})
export class DeveloperModule {}
