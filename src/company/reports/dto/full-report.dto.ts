import { ApiProperty } from '@nestjs/swagger';

export class ProjectAnalysisDto {
  @ApiProperty({ description: 'Project ID' })
  id: number;

  @ApiProperty({ description: 'Project name' })
  name: string;

  @ApiProperty({ description: 'GitHub URL' })
  githubUrl: string;

  @ApiProperty({ description: 'Project type', example: 'FULLSTACK' })
  projectType: string;

  @ApiProperty({ description: 'Project description', nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Tech stack used',
    example: ['React', 'TypeScript', 'Node.js'],
  })
  techStack: string[];

  @ApiProperty({ description: 'Quality score (0-100)' })
  score: number;

  @ApiProperty({
    description: 'What the developer did well',
    example: ['Clean code structure', 'Good error handling'],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Constructive feedback for improvement',
    example: ['Could add more tests', 'Consider using TypeScript'],
  })
  areasForImprovement: string[];

  @ApiProperty({ description: 'Code organization assessment', nullable: true })
  codeOrganization: string | null;

  @ApiProperty({
    description: 'Best practices followed',
    example: ['Uses environment variables', 'Proper git workflow'],
  })
  bestPractices: string[];

  @ApiProperty({ description: 'Analysis completion date' })
  completedAt: Date;
}

/**
 * Developer profile information
 */
export class DeveloperProfileDto {
  @ApiProperty({ description: 'Developer ID' })
  id: number;

  @ApiProperty({ description: 'Developer email' })
  email: string;

  @ApiProperty({ description: 'First name', nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Last name', nullable: true })
  lastName: string | null;

  @ApiProperty({ description: 'Location', nullable: true })
  location: string | null;

  @ApiProperty({ description: 'Years of experience', nullable: true })
  yearsOfExperience: number | null;

  @ApiProperty({ description: 'Degree', nullable: true })
  degree: string | null;

  @ApiProperty({ description: 'University', nullable: true })
  university: string | null;

  @ApiProperty({ description: 'Graduation year', nullable: true })
  graduationYear: number | null;
}

/**
 * Tier 2: Hiring report (company only)
 */
export class HiringReportDto {
  @ApiProperty({ description: 'Overall technical score (0-100)' })
  overallScore: number;

  @ApiProperty({
    description: 'Junior level assessment',
    example: 'MID_JUNIOR',
  })
  juniorLevel: string;

  @ApiProperty({
    description: 'Patterns of strength across all projects',
    example: ['Strong frontend skills', 'Good code organization'],
  })
  aggregateStrengths: string[];

  @ApiProperty({
    description: 'Recurring gaps or issues',
    example: ['Limited backend experience', 'Testing gaps'],
  })
  aggregateWeaknesses: string[];

  @ApiProperty({
    description: 'Recommended interview questions (5-10)',
    example: [
      'Explain your approach to state management in React',
      'How do you handle API errors?',
    ],
  })
  interviewQuestions: string[];

  @ApiProperty({
    description: 'Technical skills to develop during onboarding',
    example: ['Database design', 'Unit testing'],
  })
  onboardingAreas: string[];

  @ApiProperty({
    description: 'What support this developer needs',
    example: ['Code review guidance', 'Mentorship on backend'],
  })
  mentoringNeeds: string[];

  @ApiProperty({
    description: 'Technical proficiency breakdown',
    example: { React: 8, TypeScript: 7, 'Node.js': 5 },
    nullable: true,
  })
  techProficiency: Record<string, number> | null;

  @ApiProperty({
    description: 'Critical issues if any (empty if none)',
    example: [],
  })
  redFlags: string[];

  @ApiProperty({
    description: 'Assessment of learning trajectory',
    nullable: true,
  })
  growthPotential: string | null;

  @ApiProperty({
    description: 'Hiring recommendation',
    enum: ['STRONG_HIRE', 'HIRE', 'CONSIDER', 'NOT_READY'],
  })
  recommendation: string;

  @ApiProperty({ description: 'Summary conclusion (2-3 sentences)' })
  conclusion: string;

  @ApiProperty({ description: 'Report generation date' })
  generatedAt: Date;
}

/**
 * Full report - what company sees after unlocking
 */
export class FullReportDto {
  @ApiProperty({ description: 'Developer profile information' })
  developer: DeveloperProfileDto;

  @ApiProperty({ description: 'Individual project analyses (Tier 1)' })
  projectAnalyses: ProjectAnalysisDto[];

  @ApiProperty({ description: 'Aggregate hiring report (Tier 2)' })
  hiringReport: HiringReportDto;

  @ApiProperty({ description: 'When the company unlocked this report' })
  unlockedAt: Date;
}
