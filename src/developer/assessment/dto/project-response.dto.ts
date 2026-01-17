import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from './create-project.dto';

export class ProjectAnalysisResponseDto {
  @ApiProperty({ description: 'Analysis status' })
  status: 'PENDING' | 'ANALYZING' | 'COMPLETE' | 'FAILED';

  @ApiPropertyOptional({ description: 'Score (0-100)' })
  score?: number;

  @ApiPropertyOptional({ type: [String], description: 'Strengths identified' })
  strengths?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Areas for improvement' })
  areasForImprovement?: string[];

  @ApiPropertyOptional({ description: 'Code organization assessment' })
  codeOrganization?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Best practices followed',
  })
  bestPractices?: string[];

  @ApiPropertyOptional({ description: 'Error message if analysis failed' })
  errorMessage?: string;
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'Project ID' })
  id: number;

  @ApiProperty({ description: 'Project name' })
  name: string;

  @ApiProperty({ description: 'GitHub repository URL' })
  githubUrl: string;

  @ApiProperty({ enum: ProjectType, description: 'Type of project' })
  projectType: ProjectType;

  @ApiPropertyOptional({ description: 'Project description' })
  description?: string;

  @ApiProperty({ type: [String], description: 'Detected tech stack' })
  techStack: string[];

  @ApiPropertyOptional({ description: 'When project was saved/analyzed' })
  savedAt?: Date;

  @ApiPropertyOptional({ description: 'When project can be modified/deleted' })
  lockedUntil?: Date;

  @ApiProperty({ description: 'Whether project is currently locked' })
  isLocked: boolean;

  @ApiProperty({ description: 'Days remaining in lock period' })
  lockDaysRemaining: number;

  @ApiPropertyOptional({
    type: ProjectAnalysisResponseDto,
    description: 'Tier 1 analysis (developer can see)',
  })
  analysis?: ProjectAnalysisResponseDto;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  projects: ProjectResponseDto[];

  @ApiProperty({ description: 'Total number of projects' })
  count: number;

  @ApiProperty({ description: 'Maximum allowed projects' })
  maxProjects: number;
}
