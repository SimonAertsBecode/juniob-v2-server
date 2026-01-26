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
 * Technology experience for report
 */
export class TechExperienceReportDto {
  @ApiProperty({ description: 'Stack name', example: 'React.js' })
  stackName: string;

  @ApiProperty({ description: 'Experience in months', example: 12 })
  months: number;
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

  @ApiProperty({
    description: 'Technology experiences (self-reported)',
    type: [TechExperienceReportDto],
  })
  techExperiences: TechExperienceReportDto[];
}

/**
 * Technical skill breakdown section
 */
export class TechnicalSkillSectionDto {
  @ApiProperty({ description: 'Summary of this skill area (1-2 sentences)' })
  summary: string;

  @ApiProperty({
    description: 'Key strengths observed',
    example: ['Clean separation of concerns'],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Improvement areas',
    example: ['Could add more error handling'],
  })
  improvements: string[];
}

/**
 * Full technical breakdown
 */
export class TechnicalBreakdownDto {
  @ApiProperty({ description: 'Code structure & readability assessment' })
  codeStructure: TechnicalSkillSectionDto;

  @ApiProperty({ description: 'Core fundamentals assessment' })
  coreFundamentals: TechnicalSkillSectionDto;

  @ApiProperty({ description: 'Problem-solving approach assessment' })
  problemSolving: TechnicalSkillSectionDto;

  @ApiProperty({ description: 'Tooling & best practices assessment' })
  toolingPractices: TechnicalSkillSectionDto;
}

/**
 * Tier 2: Hiring report (company only) - follows TECHNICAL_REPORT_SPECS.md
 */
export class HiringReportDto {
  // 1. PRIMARY DECISION SIGNAL - Hiring Recommendation (Top Section)
  @ApiProperty({
    description: 'Hiring recommendation - PRIMARY decision signal',
    enum: ['SAFE_TO_INTERVIEW', 'INTERVIEW_WITH_CAUTION', 'NOT_READY'],
  })
  recommendation: string;

  @ApiProperty({
    description: '3-5 bullet points explaining the recommendation',
    example: [
      'Solid understanding of core concepts',
      'Clean and readable code structure',
    ],
  })
  recommendationReasons: string[];

  // 2. Junior Level Benchmark
  @ApiProperty({
    description: 'Junior level benchmark',
    enum: ['ABOVE_EXPECTED', 'WITHIN_EXPECTED', 'BELOW_EXPECTED'],
  })
  juniorLevel: string;

  @ApiProperty({
    description: 'Context for junior level (e.g., Junior Frontend)',
    example: 'Junior Frontend',
    nullable: true,
  })
  juniorLevelContext: string | null;

  // 3. Technical Skill Breakdown
  @ApiProperty({
    description: 'Technical skill breakdown (4 sections)',
    type: TechnicalBreakdownDto,
    nullable: true,
  })
  technicalBreakdown: TechnicalBreakdownDto | null;

  // 4. Risk Flags / Points of Attention
  @ApiProperty({
    description: 'Potential risks that could cause surprises after hiring',
    example: ['Heavy reliance on tutorials', 'Limited debugging strategy'],
  })
  riskFlags: string[];

  // 5. Authenticity & Confidence Signal
  @ApiProperty({
    description: 'Confidence in candidate understanding their own work',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    nullable: true,
  })
  authenticitySignal: string | null;

  @ApiProperty({
    description: 'Explanation of authenticity signals observed',
    nullable: true,
  })
  authenticityExplanation: string | null;

  // 6. Interview Guidance
  @ApiProperty({
    description: 'Recommended interview questions (3-5)',
    example: [
      'Ask about state management approach',
      'Probe debugging strategy',
    ],
  })
  interviewQuestions: string[];

  // 7. Technical Confidence Score (SECONDARY)
  @ApiProperty({
    description:
      'Overall technical score (0-100) - SECONDARY to recommendation',
  })
  overallScore: number;

  @ApiProperty({
    description: 'Score band for quick reference',
    enum: ['STRONG_JUNIOR', 'AVERAGE_JUNIOR', 'RISKY_JUNIOR'],
    nullable: true,
  })
  scoreBand: string | null;

  // Summary & Additional
  @ApiProperty({ description: 'Summary conclusion (2-3 sentences)' })
  conclusion: string;

  @ApiProperty({
    description: 'Technical proficiency breakdown',
    example: { React: 8, TypeScript: 7, 'Node.js': 5 },
    nullable: true,
  })
  techProficiency: Record<string, number> | null;

  @ApiProperty({
    description: 'What support this developer needs',
    example: ['Code review guidance', 'Mentorship on backend'],
  })
  mentoringNeeds: string[];

  @ApiProperty({
    description: 'Assessment of learning trajectory',
    nullable: true,
  })
  growthPotential: string | null;

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
