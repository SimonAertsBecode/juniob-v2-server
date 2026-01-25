import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '../../common/decorators';
import { PipelineService } from './pipeline.service';
import {
  PipelineEntryDto,
  PipelineListDto,
  PipelineStatsDto,
  PipelineQueryDto,
  UpdatePipelineStageDto,
  SetPipelineTagsDto,
} from './dto';

@ApiTags('Company - Pipeline')
@ApiBearerAuth()
@Controller('company/pipeline')
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  @Get()
  @ApiOperation({
    summary: 'Get pipeline entries',
    description:
      'Get all candidates in the pipeline with pagination and filtering',
  })
  @ApiQuery({ name: 'stage', required: false, description: 'Filter by stage' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit per page (max 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field (createdAt, updatedAt, stage)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc, desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pipeline entries',
    type: PipelineListDto,
  })
  async getPipeline(
    @GetCurrentUserId() companyId: number,
    @Query() query: PipelineQueryDto,
  ): Promise<PipelineListDto> {
    return this.pipelineService.getPipeline(companyId, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get pipeline statistics',
    description: 'Get count of candidates per pipeline stage',
  })
  @ApiResponse({
    status: 200,
    description: 'Pipeline statistics',
    type: PipelineStatsDto,
  })
  async getPipelineStats(
    @GetCurrentUserId() companyId: number,
  ): Promise<PipelineStatsDto> {
    return this.pipelineService.getPipelineStats(companyId);
  }

  @Get(':developerId')
  @ApiOperation({
    summary: 'Get single pipeline entry',
    description: 'Get pipeline entry for a specific developer',
  })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline entry',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found in pipeline',
  })
  async getPipelineEntry(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<PipelineEntryDto> {
    const entry = await this.pipelineService.getPipelineEntry(
      companyId,
      developerId,
    );
    if (!entry) {
      throw new NotFoundException('Developer not found in pipeline');
    }
    return entry;
  }

  @Patch(':developerId/stage')
  @ApiOperation({
    summary: 'Update pipeline stage',
    description:
      'Update the pipeline stage for a developer (only HIRED or REJECTED)',
  })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage updated',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found in pipeline',
  })
  async updateStage(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
    @Body() dto: UpdatePipelineStageDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.updateStage(companyId, developerId, dto.stage);
  }

  @Patch(':developerId/tags')
  @ApiOperation({
    summary: 'Set pipeline entry tags',
    description: 'Set tags for a pipeline entry (replaces all existing tags)',
  })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Tags updated',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found in pipeline or tag not found',
  })
  async setTags(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
    @Body() dto: SetPipelineTagsDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.setTags(companyId, developerId, dto.tagIds);
  }

  @Delete(':developerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove from pipeline',
    description: 'Remove a developer from the company pipeline',
  })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 204,
    description: 'Developer removed from pipeline',
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found in pipeline',
  })
  async removeFromPipeline(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<void> {
    return this.pipelineService.removeFromPipeline(companyId, developerId);
  }
}
