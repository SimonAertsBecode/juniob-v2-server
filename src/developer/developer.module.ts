import { Module } from '@nestjs/common';
import { AssessmentModule } from './assessment/assessment.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [AssessmentModule, ProfileModule],
  exports: [AssessmentModule, ProfileModule],
})
export class DeveloperModule {}
