import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
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
  PipelineGroupedDto,
  PipelineStatsDto,
  PipelineQueryDto,
  UpdatePipelineStageDto,
  UpdatePipelineNotesDto,
  AddToPipelineDto,
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

  @Get('grouped')
  @ApiOperation({
    summary: 'Get pipeline grouped by stage',
    description: 'Get all candidates grouped by their pipeline stage',
  })
  @ApiResponse({
    status: 200,
    description: 'Pipeline entries grouped by stage',
    type: PipelineGroupedDto,
  })
  async getPipelineGrouped(
    @GetCurrentUserId() companyId: number,
  ): Promise<PipelineGroupedDto> {
    return this.pipelineService.getPipelineGrouped(companyId);
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
      throw new Error('Developer not found in pipeline');
    }
    return entry;
  }

  @Post()
  @ApiOperation({
    summary: 'Add developer to pipeline',
    description: 'Add a developer to the company pipeline',
  })
  @ApiResponse({
    status: 201,
    description: 'Developer added to pipeline',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Developer already in pipeline',
  })
  async addToPipeline(
    @GetCurrentUserId() companyId: number,
    @Body() dto: AddToPipelineDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.addToPipeline(
      companyId,
      dto.developerId,
      dto.notes,
    );
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

  @Patch(':developerId/notes')
  @ApiOperation({
    summary: 'Update pipeline notes',
    description: 'Update private notes about a candidate',
  })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Notes updated',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found in pipeline',
  })
  async updateNotes(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
    @Body() dto: UpdatePipelineNotesDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.updateNotes(
      companyId,
      developerId,
      dto.notes || null,
    );
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
