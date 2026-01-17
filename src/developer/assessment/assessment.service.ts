import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
import { AiService } from '../../ai/ai.service';
import {
  CreateProjectDto,
  ProjectResponseDto,
  ProjectListResponseDto,
  AssessmentStatusDto,
} from './dto';
import {
  AssessmentStatus,
  ProjectAnalysisStatus,
  ProjectType,
} from '../../../prisma/generated/prisma';

const MAX_PROJECTS = 3;
const LOCK_DAYS = 30;

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    private prisma: PrismaService,
    private githubService: GithubService,
    private aiService: AiService,
  ) {}

  /**
   * Get all projects for a developer
   */
  async getProjects(developerId: number): Promise<ProjectListResponseDto> {
    const projects = await this.prisma.technicalProject.findMany({
      where: { developerId },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      projects: projects.map((p) => this.mapProjectToResponse(p)),
      count: projects.length,
      maxProjects: MAX_PROJECTS,
    };
  }

  /**
   * Get a single project by ID
   */
  async getProject(
    developerId: number,
    projectId: number,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.technicalProject.findFirst({
      where: { id: projectId, developerId },
      include: { analysis: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.mapProjectToResponse(project);
  }

  /**
   * Create a new technical project
   */
  async createProject(
    developerId: number,
    dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    // Check project limit
    const existingCount = await this.prisma.technicalProject.count({
      where: { developerId },
    });

    if (existingCount >= MAX_PROJECTS) {
      throw new BadRequestException(
        `You can only have up to ${MAX_PROJECTS} projects. Delete one before adding a new project.`,
      );
    }

    // Validate GitHub repository
    const { owner, repo } = await this.githubService.validateRepository(
      dto.githubUrl,
    );

    // Check for duplicate repository
    const existingRepo = await this.prisma.technicalProject.findFirst({
      where: { developerId, githubUrl: dto.githubUrl },
    });

    if (existingRepo) {
      throw new ConflictException('You have already added this repository');
    }

    // Get languages for initial tech stack
    const languages = await this.githubService.listRepoLanguages(owner, repo);

    // Create project with pending analysis
    const project = await this.prisma.technicalProject.create({
      data: {
        developerId,
        name: dto.name,
        githubUrl: dto.githubUrl,
        projectType: dto.projectType as ProjectType,
        description: dto.description,
        techStack: languages,
        analysis: {
          create: {
            status: ProjectAnalysisStatus.PENDING,
          },
        },
      },
      include: { analysis: true },
    });

    // Update developer status to PROJECTS_SUBMITTED if was REGISTERING
    await this.updateDeveloperStatus(developerId);

    this.logger.log(
      `Created project ${project.id} for developer ${developerId}`,
    );

    return this.mapProjectToResponse(project);
  }

  /**
   * Update a project's name (only name can be changed while locked)
   */
  async updateProjectName(
    developerId: number,
    projectId: number,
    name: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.technicalProject.findFirst({
      where: { id: projectId, developerId },
      include: { analysis: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.technicalProject.update({
      where: { id: projectId },
      data: { name },
      include: { analysis: true },
    });

    return this.mapProjectToResponse(updated);
  }

  /**
   * Delete a project (only after lock period expires)
   */
  async deleteProject(developerId: number, projectId: number): Promise<void> {
    const project = await this.prisma.technicalProject.findFirst({
      where: { id: projectId, developerId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (this.isProjectLocked(project.lockedUntil)) {
      throw new ForbiddenException(
        `Cannot delete project within ${LOCK_DAYS} days of analysis. This prevents gaming the system.`,
      );
    }

    await this.prisma.technicalProject.delete({
      where: { id: projectId },
    });

    // Update developer status - may need regeneration
    await this.handleProjectDeletion(developerId);

    this.logger.log(
      `Deleted project ${projectId} for developer ${developerId}`,
    );
  }

  /**
   * Get assessment status for a developer
   */
  async getAssessmentStatus(developerId: number): Promise<AssessmentStatusDto> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        projects: { include: { analysis: true } },
        hiringReport: true,
      },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    const projectCount = developer.projects.length;
    const analyzedCount = developer.projects.filter(
      (p) => p.analysis?.status === ProjectAnalysisStatus.COMPLETE,
    ).length;
    const pendingCount = developer.projects.filter(
      (p) =>
        p.analysis?.status === ProjectAnalysisStatus.PENDING ||
        p.analysis?.status === ProjectAnalysisStatus.ANALYZING,
    ).length;

    // Collect all tech stacks
    const techStack = [
      ...new Set(developer.projects.flatMap((p) => p.techStack)),
    ];

    // Determine visibility
    const isVisibleToCompanies =
      developer.assessmentStatus === AssessmentStatus.ASSESSED &&
      developer.hiringReport !== null;

    let visibilityReason: string | undefined;
    if (!isVisibleToCompanies) {
      if (projectCount === 0) {
        visibilityReason = 'Submit at least one project to be visible';
      } else if (analyzedCount < projectCount) {
        visibilityReason = 'Analysis still in progress';
      } else if (!developer.hiringReport) {
        visibilityReason = 'Hiring report being generated';
      }
    }

    const statusDescriptions: Record<AssessmentStatus, string> = {
      REGISTERING: 'Complete your profile and submit projects',
      PROJECTS_SUBMITTED: 'Projects submitted, waiting for analysis',
      ANALYZING: 'AI analysis in progress',
      PENDING_ANALYSIS: 'Project changes detected, please regenerate report',
      ASSESSED: 'Assessment complete! Your profile is visible to companies',
    };

    return {
      status: developer.assessmentStatus,
      statusDescription: statusDescriptions[developer.assessmentStatus],
      projectCount,
      analyzedCount,
      pendingCount,
      hasHiringReport: developer.hiringReport !== null,
      overallScore: developer.hiringReport?.overallScore,
      techStack: techStack.length > 0 ? techStack : undefined,
      isVisibleToCompanies,
      visibilityReason,
    };
  }

  /**
   * Manually trigger report regeneration (after project deletion/modification)
   */
  async triggerReportRegeneration(developerId: number): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: { projects: { include: { analysis: true } } },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    if (developer.projects.length === 0) {
      throw new BadRequestException('No projects to analyze');
    }

    // Reset projects that need re-analysis
    for (const project of developer.projects) {
      if (
        !project.analysis ||
        project.analysis.status === ProjectAnalysisStatus.FAILED
      ) {
        await this.prisma.projectAnalysis.upsert({
          where: { projectId: project.id },
          create: {
            projectId: project.id,
            status: ProjectAnalysisStatus.PENDING,
          },
          update: {
            status: ProjectAnalysisStatus.PENDING,
            errorMessage: null,
            retryCount: 0,
          },
        });
      }
    }

    // Update developer status
    await this.prisma.developer.update({
      where: { id: developerId },
      data: { assessmentStatus: AssessmentStatus.PROJECTS_SUBMITTED },
    });

    this.logger.log(
      `Triggered report regeneration for developer ${developerId}`,
    );
  }

  // ========================================
  // CRON JOBS FOR ANALYSIS PROCESSING
  // ========================================

  /**
   * Process pending project analyses (every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processAnalysisQueue(): Promise<void> {
    this.logger.log('Checking for projects pending analysis...');

    const pendingAnalyses = await this.prisma.projectAnalysis.findMany({
      where: {
        status: {
          in: [ProjectAnalysisStatus.PENDING, ProjectAnalysisStatus.ANALYZING],
        },
      },
      include: {
        project: {
          include: { developer: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    if (pendingAnalyses.length === 0) {
      this.logger.log('No projects pending analysis');
      return;
    }

    this.logger.log(`Processing ${pendingAnalyses.length} projects...`);

    for (const analysis of pendingAnalyses) {
      try {
        await this.analyzeProject(analysis.projectId);

        // Check if all projects for this developer are now analyzed
        await this.checkAndGenerateHiringReport(analysis.project.developerId);

        // Rate limit protection
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error: any) {
        this.logger.error(
          `Failed to analyze project ${analysis.projectId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Check for developers needing hiring report regeneration (every 10 minutes)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processHiringReportGeneration(): Promise<void> {
    this.logger.log('Checking for developers needing hiring report...');

    // Find developers with all projects analyzed but no hiring report
    const developers = await this.prisma.developer.findMany({
      where: {
        assessmentStatus: {
          in: [AssessmentStatus.PROJECTS_SUBMITTED, AssessmentStatus.ANALYZING],
        },
        projects: {
          some: {},
        },
      },
      include: {
        projects: { include: { analysis: true } },
        hiringReport: true,
      },
    });

    for (const developer of developers) {
      const allAnalyzed = developer.projects.every(
        (p) => p.analysis?.status === ProjectAnalysisStatus.COMPLETE,
      );

      if (allAnalyzed && developer.projects.length > 0) {
        try {
          await this.generateHiringReport(developer.id);
        } catch (error: any) {
          this.logger.error(
            `Failed to generate hiring report for developer ${developer.id}: ${error.message}`,
          );
        }
      }
    }
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private async analyzeProject(projectId: number): Promise<void> {
    const project = await this.prisma.technicalProject.findUnique({
      where: { id: projectId },
      include: { developer: true },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Update status to ANALYZING
    await this.prisma.projectAnalysis.update({
      where: { projectId },
      data: {
        status: ProjectAnalysisStatus.ANALYZING,
        startedAt: new Date(),
      },
    });

    // Update developer status
    await this.prisma.developer.update({
      where: { id: project.developerId },
      data: { assessmentStatus: AssessmentStatus.ANALYZING },
    });

    try {
      // Fetch repository files
      const files = await this.githubService.fetchRepositoryStructure(
        project.githubUrl,
      );

      if (files.length === 0) {
        throw new Error('No relevant code files found in repository');
      }

      // Sort by priority and limit
      const sortedFiles = files.sort(
        (a, b) =>
          this.githubService.getFilePriority(b.path) -
          this.githubService.getFilePriority(a.path),
      );

      const MAX_CONTENT_SIZE = 100000;
      const MAX_FILES = 75;

      let totalSize = 0;
      const filesToAnalyze = [];

      for (const file of sortedFiles) {
        if (filesToAnalyze.length >= MAX_FILES) break;
        if (totalSize + file.content.length > MAX_CONTENT_SIZE) break;
        filesToAnalyze.push(file);
        totalSize += file.content.length;
      }

      // Create code snippets
      const codeSnippets = filesToAnalyze
        .map((file) => {
          const maxFileSize = 5000;
          const content =
            file.content.length > maxFileSize
              ? file.content.slice(0, maxFileSize) + '\n// ... (truncated)'
              : file.content;
          return `// File: ${file.path}\n${content}`;
        })
        .join('\n\n');

      // Get languages
      const { owner, repo } = this.githubService.parseGithubUrl(
        project.githubUrl,
      );
      const languages = await this.githubService.listRepoLanguages(owner, repo);

      // Detect fullstack
      const isFullstackByStructure =
        this.githubService.detectFullstackByStructure(files);

      // Analyze with AI
      const result = await this.aiService.analyzeProject(
        codeSnippets,
        filesToAnalyze.length,
        {
          name: project.name,
          description: project.description || '',
          projectType: project.projectType,
          languages,
          isFullstackByStructure,
        },
      );

      // Update project with results
      const now = new Date();
      const lockedUntil = new Date(
        now.getTime() + LOCK_DAYS * 24 * 60 * 60 * 1000,
      );

      await this.prisma.technicalProject.update({
        where: { id: projectId },
        data: {
          techStack: result.techStack.length > 0 ? result.techStack : languages,
          savedAt: now,
          lockedUntil,
        },
      });

      await this.prisma.projectAnalysis.update({
        where: { projectId },
        data: {
          status: ProjectAnalysisStatus.COMPLETE,
          score: result.score,
          strengths: result.strengths,
          areasForImprovement: result.weaknesses,
          codeOrganization: result.codeOrganization,
          bestPractices: [], // Can be extracted from strengths
          rawAnalysis: result as any,
          completedAt: now,
          retryCount: 0,
        },
      });

      this.logger.log(
        `Successfully analyzed project ${projectId} (score: ${result.score})`,
      );
    } catch (error: any) {
      const analysis = await this.prisma.projectAnalysis.findUnique({
        where: { projectId },
      });

      const newRetryCount = (analysis?.retryCount || 0) + 1;
      const maxRetries = 3;

      if (newRetryCount < maxRetries) {
        await this.prisma.projectAnalysis.update({
          where: { projectId },
          data: {
            status: ProjectAnalysisStatus.PENDING,
            retryCount: newRetryCount,
            errorMessage: error.message,
          },
        });
        this.logger.warn(
          `Project ${projectId} will retry (${maxRetries - newRetryCount} attempts remaining)`,
        );
      } else {
        await this.prisma.projectAnalysis.update({
          where: { projectId },
          data: {
            status: ProjectAnalysisStatus.FAILED,
            retryCount: newRetryCount,
            errorMessage: error.message,
          },
        });
        this.logger.error(
          `Project ${projectId} failed after ${maxRetries} attempts`,
        );
      }

      throw error;
    }
  }

  private async generateHiringReport(developerId: number): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        projects: { include: { analysis: true } },
      },
    });

    if (!developer || developer.projects.length === 0) {
      return;
    }

    // Prepare project data
    const projectsData = developer.projects
      .filter((p) => p.analysis?.status === ProjectAnalysisStatus.COMPLETE)
      .map((p) => ({
        name: p.name,
        description: p.description || '',
        projectType: p.projectType,
        score: p.analysis!.score || 0,
        strengths: p.analysis!.strengths,
        weaknesses: p.analysis!.areasForImprovement,
        strengthsSummary: '',
        weaknessesSummary: '',
        techStack: p.techStack,
      }));

    if (projectsData.length === 0) {
      return;
    }

    this.logger.log(
      `Generating hiring report for developer ${developerId} with ${projectsData.length} projects`,
    );

    const report = await this.aiService.generateHiringReport(projectsData, {
      firstName: developer.firstName || undefined,
      lastName: developer.lastName || undefined,
      yearsOfExperience: developer.yearsOfExperience || undefined,
    });

    // Map recommendation to HireRecommendation enum
    const recommendationMap: Record<string, string> = {
      SAFE_TO_INTERVIEW: 'STRONG_HIRE',
      INTERVIEW_WITH_CAUTION: 'CONSIDER',
      NOT_READY: 'NOT_READY',
    };

    const juniorLevelMap: Record<string, string> = {
      ABOVE_EXPECTED: 'SENIOR_JUNIOR',
      WITHIN_EXPECTED: 'MID_JUNIOR',
      BELOW_EXPECTED: 'EARLY_JUNIOR',
    };

    await this.prisma.hiringReport.upsert({
      where: { developerId },
      create: {
        developerId,
        overallScore: report.overallScore,
        juniorLevel: juniorLevelMap[report.juniorLevel] as any,
        aggregateStrengths: report.recommendationReasons,
        aggregateWeaknesses: report.riskFlags,
        interviewQuestions: report.interviewQuestions,
        onboardingAreas: report.mentoringNeeds,
        mentoringNeeds: report.mentoringNeeds,
        techProficiency: report.techProficiency,
        redFlags: report.riskFlags,
        growthPotential: report.growthPotential,
        recommendation: recommendationMap[report.recommendation] as any,
        conclusion: report.conclusion,
        rawAnalysis: report as any,
      },
      update: {
        overallScore: report.overallScore,
        juniorLevel: juniorLevelMap[report.juniorLevel] as any,
        aggregateStrengths: report.recommendationReasons,
        aggregateWeaknesses: report.riskFlags,
        interviewQuestions: report.interviewQuestions,
        onboardingAreas: report.mentoringNeeds,
        mentoringNeeds: report.mentoringNeeds,
        techProficiency: report.techProficiency,
        redFlags: report.riskFlags,
        growthPotential: report.growthPotential,
        recommendation: recommendationMap[report.recommendation] as any,
        conclusion: report.conclusion,
        rawAnalysis: report as any,
      },
    });

    // Update developer status
    await this.prisma.developer.update({
      where: { id: developerId },
      data: { assessmentStatus: AssessmentStatus.ASSESSED },
    });

    this.logger.log(
      `Successfully generated hiring report for developer ${developerId}`,
    );
  }

  private async checkAndGenerateHiringReport(
    developerId: number,
  ): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: { projects: { include: { analysis: true } } },
    });

    if (!developer || developer.projects.length === 0) {
      return;
    }

    const allAnalyzed = developer.projects.every(
      (p) => p.analysis?.status === ProjectAnalysisStatus.COMPLETE,
    );

    if (allAnalyzed) {
      await this.generateHiringReport(developerId);
    }
  }

  private async updateDeveloperStatus(developerId: number): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (developer?.assessmentStatus === AssessmentStatus.REGISTERING) {
      await this.prisma.developer.update({
        where: { id: developerId },
        data: { assessmentStatus: AssessmentStatus.PROJECTS_SUBMITTED },
      });
    }
  }

  private async handleProjectDeletion(developerId: number): Promise<void> {
    const projects = await this.prisma.technicalProject.findMany({
      where: { developerId },
    });

    if (projects.length === 0) {
      // No projects left - delete hiring report
      await this.prisma.hiringReport.deleteMany({
        where: { developerId },
      });
      await this.prisma.developer.update({
        where: { id: developerId },
        data: { assessmentStatus: AssessmentStatus.REGISTERING },
      });
    } else {
      // Set to pending analysis - needs regeneration
      await this.prisma.developer.update({
        where: { id: developerId },
        data: { assessmentStatus: AssessmentStatus.PENDING_ANALYSIS },
      });
    }
  }

  private isProjectLocked(lockedUntil: Date | null): boolean {
    if (!lockedUntil) return false;
    return new Date() < lockedUntil;
  }

  private mapProjectToResponse(project: any): ProjectResponseDto {
    const isLocked = this.isProjectLocked(project.lockedUntil);
    const lockDaysRemaining =
      isLocked && project.lockedUntil
        ? Math.ceil(
            (project.lockedUntil.getTime() - Date.now()) /
              (24 * 60 * 60 * 1000),
          )
        : 0;

    return {
      id: project.id,
      name: project.name,
      githubUrl: project.githubUrl,
      projectType: project.projectType,
      description: project.description,
      techStack: project.techStack || [],
      savedAt: project.savedAt,
      lockedUntil: project.lockedUntil,
      isLocked,
      lockDaysRemaining,
      analysis: project.analysis
        ? {
            status: project.analysis.status,
            score: project.analysis.score,
            strengths: project.analysis.strengths,
            areasForImprovement: project.analysis.areasForImprovement,
            codeOrganization: project.analysis.codeOrganization,
            bestPractices: project.analysis.bestPractices,
            errorMessage: project.analysis.errorMessage,
          }
        : undefined,
      createdAt: project.createdAt,
    };
  }
}
