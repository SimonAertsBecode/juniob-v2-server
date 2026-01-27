import { Module } from '@nestjs/common';
import { PipelineController, InvitationPublicController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';

@Module({
  controllers: [PipelineController, InvitationPublicController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
