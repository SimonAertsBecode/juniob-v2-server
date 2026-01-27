import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import {
  CreateProjectDto,
  ProjectResponseDto,
  ProjectListResponseDto,
  AssessmentStatusDto,
} from './dto';
import { AtGuard } from '../../common/guards';
import { GetCurrentUserTableId } from 'src/common/decorators';

@ApiTags('Developer Assessment')
@Controller('developer/assessment')
@UseGuards(AtGuard)
@ApiBearerAuth('access-token')
export class AssessmentController {
  constructor(private assessmentService: AssessmentService) {}

  // ========================================
  // ASSESSMENT STATUS
  // ========================================

  @Get('status')
  @ApiOperation({
    summary: 'Get assessment status for authenticated developer',
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment status retrieved',
    type: AssessmentStatusDto,
  })
  async getAssessmentStatus(
    @GetCurrentUserTableId() developerId: number,
  ): Promise<AssessmentStatusDto> {
    return this.assessmentService.getAssessmentStatus(developerId);
  }

  @Post('regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger report regeneration',
    description:
      'Use after project deletion/modification to regenerate hiring report',
  })
  @ApiResponse({ status: 200, description: 'Regeneration triggered' })
  @ApiResponse({ status: 400, description: 'No projects to analyze' })
  async triggerReportRegeneration(
    @GetCurrentUserTableId() developerId: number,
  ): Promise<{ message: string }> {
    await this.assessmentService.triggerReportRegeneration(developerId);
    return {
      message:
        'Report regeneration triggered. Your projects will be analyzed shortly.',
    };
  }

  // ========================================
  // PROJECT MANAGEMENT
  // ========================================

  @Get('projects')
  @ApiOperation({ summary: 'Get all projects for authenticated developer' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved',
    type: ProjectListResponseDto,
  })
  async getProjects(
    @GetCurrentUserTableId() developerId: number,
  ): Promise<ProjectListResponseDto> {
    return this.assessmentService.getProjects(developerId);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(
    @GetCurrentUserTableId() developerId: number,
    @Param('id', ParseIntPipe) projectId: number,
  ): Promise<ProjectResponseDto> {
    return this.assessmentService.getProject(developerId, projectId);
  }

  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new technical project',
    description:
      'Add a GitHub repository for analysis. Max 3 projects per developer.',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created and queued for analysis',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or project limit exceeded',
  })
  @ApiResponse({
    status: 409,
    description: 'Repository already added',
  })
  async createProject(
    @GetCurrentUserTableId() developerId: number,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.assessmentService.createProject(developerId, dto);
  }

  @Patch('projects/:id/name')
  @ApiOperation({
    summary: 'Update project name',
    description:
      'Only the name can be changed. GitHub URL and type are immutable after creation.',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project name updated',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProjectName(
    @GetCurrentUserTableId() developerId: number,
    @Param('id', ParseIntPipe) projectId: number,
    @Body('name') name: string,
  ): Promise<ProjectResponseDto> {
    return this.assessmentService.updateProjectName(
      developerId,
      projectId,
      name,
    );
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a project',
    description:
      'Projects are locked for 30 days after analysis to prevent gaming.',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiResponse({ status: 403, description: 'Project is locked' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(
    @GetCurrentUserTableId() developerId: number,
    @Param('id', ParseIntPipe) projectId: number,
  ): Promise<void> {
    return this.assessmentService.deleteProject(developerId, projectId);
  }
}
