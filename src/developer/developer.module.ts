import { Module } from '@nestjs/common';
import { DeveloperAuthModule } from './auth/developer-auth.module';
import { AssessmentModule } from './assessment/assessment.module';

@Module({
  imports: [DeveloperAuthModule, AssessmentModule],
  exports: [DeveloperAuthModule, AssessmentModule],
})
export class DeveloperModule {}
