import { Module } from '@nestjs/common';
import { DeveloperAuthModule } from './auth/developer-auth.module';
import { AssessmentModule } from './assessment/assessment.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [DeveloperAuthModule, AssessmentModule, ProfileModule],
  exports: [DeveloperAuthModule, AssessmentModule, ProfileModule],
})
export class DeveloperModule {}
