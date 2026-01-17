import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
