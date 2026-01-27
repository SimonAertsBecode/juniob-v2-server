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
import { GetCurrentUserTableId, Public } from '../../common/decorators';
import { PipelineService } from './pipeline.service';
import {
  PipelineEntryDto,
  PipelineListDto,
  PipelineStatsDto,
  PipelineQueryDto,
  UpdatePipelineStageDto,
  SetPipelineTagsDto,
  CreateInvitationDto,
  UpdateNotesDto,
  InvitationInfoDto,
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
    @GetCurrentUserTableId() companyId: number,
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
    @GetCurrentUserTableId() companyId: number,
  ): Promise<PipelineStatsDto> {
    return this.pipelineService.getPipelineStats(companyId);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create invitation / track candidate',
    description:
      'Create a new pipeline entry for a candidate. If the candidate is already registered, adds them to pipeline. Otherwise creates a pending invitation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pipeline entry created',
    type: PipelineEntryDto,
  })
  @ApiResponse({ status: 409, description: 'Candidate already in pipeline' })
  async createInvitation(
    @GetCurrentUserTableId() companyId: number,
    @Body() dto: CreateInvitationDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.createInvitation(companyId, dto);
  }

  @Post(':entryId/resend-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend invitation email',
    description: 'Resend the invitation email for a pending invitation',
  })
  @ApiParam({ name: 'entryId', description: 'Pipeline entry ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot resend - candidate already registered',
  })
  @ApiResponse({ status: 404, description: 'Pipeline entry not found' })
  async resendInvitation(
    @GetCurrentUserTableId() companyId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.resendInvitation(companyId, entryId);
  }

  @Patch(':entryId/notes')
  @ApiOperation({
    summary: 'Update notes',
    description: 'Update private notes for a pipeline entry',
  })
  @ApiParam({ name: 'entryId', description: 'Pipeline entry ID' })
  @ApiResponse({
    status: 200,
    description: 'Notes updated',
    type: PipelineEntryDto,
  })
  @ApiResponse({ status: 404, description: 'Pipeline entry not found' })
  async updateNotes(
    @GetCurrentUserTableId() companyId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdateNotesDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.updateNotes(companyId, entryId, dto);
  }

  @Get(':entryId')
  @ApiOperation({
    summary: 'Get single pipeline entry',
    description: 'Get pipeline entry by ID',
  })
  @ApiParam({ name: 'entryId', description: 'Pipeline entry ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline entry',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline entry not found',
  })
  async getPipelineEntry(
    @GetCurrentUserTableId() companyId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
  ): Promise<PipelineEntryDto> {
    const entry = await this.pipelineService.getPipelineEntry(
      companyId,
      entryId,
    );
    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }
    return entry;
  }

  @Patch(':entryId/stage')
  @ApiOperation({
    summary: 'Update pipeline stage',
    description:
      'Update the pipeline stage for a developer (only HIRED or REJECTED)',
  })
  @ApiParam({ name: 'entryId', description: 'Pipeline entry ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage updated',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline entry not found',
  })
  async updateStage(
    @GetCurrentUserTableId() companyId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: UpdatePipelineStageDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.updateStage(companyId, entryId, dto.stage);
  }

  @Patch(':entryId/tags')
  @ApiOperation({
    summary: 'Set pipeline entry tags',
    description: 'Set tags for a pipeline entry (replaces all existing tags)',
  })
  @ApiParam({ name: 'entryId', description: 'Pipeline entry ID' })
  @ApiResponse({
    status: 200,
    description: 'Tags updated',
    type: PipelineEntryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline entry not found or tag not found',
  })
  async setTags(
    @GetCurrentUserTableId() companyId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: SetPipelineTagsDto,
  ): Promise<PipelineEntryDto> {
    return this.pipelineService.setTags(companyId, entryId, dto.tagIds);
  }

  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove from pipeline',
    description: 'Remove a candidate from the company pipeline',
  })
  @ApiParam({ name: 'entryId', description: 'Pipeline entry ID' })
  @ApiResponse({
    status: 204,
    description: 'Candidate removed from pipeline',
  })
  @ApiResponse({
    status: 404,
    description: 'Pipeline entry not found',
  })
  async removeFromPipeline(
    @GetCurrentUserTableId() companyId: number,
    @Param('entryId', ParseIntPipe) entryId: number,
  ): Promise<void> {
    return this.pipelineService.removeFromPipeline(companyId, entryId);
  }
}

// Separate controller for public invitation endpoint
@ApiTags('Invitations')
@Controller('invitations')
export class InvitationPublicController {
  constructor(private pipelineService: PipelineService) {}

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Get invitation info by token',
    description: 'Public endpoint to get invitation details for the accept page',
  })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation info',
    type: InvitationInfoDto,
  })
  async getInvitationByToken(
    @Param('token') token: string,
  ): Promise<InvitationInfoDto> {
    return this.pipelineService.getInvitationByToken(token);
  }
}
