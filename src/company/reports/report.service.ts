import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditService } from '../credits/credit.service';
import {
  ReportPreviewDto,
  ProjectPreviewDto,
  FullReportDto,
  DeveloperProfileDto,
  ProjectAnalysisDto,
  HiringReportDto,
  UnlockReportResponseDto,
} from './dto';
import {
  AssessmentStatus,
  PipelineStage,
  ProjectAnalysisStatus,
} from '../../../prisma/generated/prisma';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private creditService: CreditService,
  ) {}

  /**
   * Check if a company has unlocked a developer's report
   */
  async isReportUnlocked(
    companyId: number,
    developerId: number,
  ): Promise<boolean> {
    const unlock = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });
    return unlock !== null;
  }

  /**
   * Get report preview (limited info, no credit required)
   */
  async getReportPreview(
    companyId: number,
    developerId: number,
  ): Promise<ReportPreviewDto> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            projectType: true,
            techStack: true,
          },
        },
        hiringReport: {
          select: {
            overallScore: true,
            juniorLevel: true,
            generatedAt: true,
          },
        },
      },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    if (developer.assessmentStatus !== AssessmentStatus.ASSESSED) {
      throw new BadRequestException(
        'Developer assessment is not complete. Current status: ' +
          developer.assessmentStatus,
      );
    }

    if (!developer.hiringReport) {
      throw new BadRequestException(
        'Hiring report not yet generated for this developer',
      );
    }

    const isUnlocked = await this.isReportUnlocked(companyId, developerId);

    // Collect all unique tech stack tags from all projects
    const techStack = [
      ...new Set(developer.projects.flatMap((p) => p.techStack)),
    ];

    const projects: ProjectPreviewDto[] = developer.projects.map((p) => ({
      id: p.id,
      name: p.name,
      projectType: p.projectType,
      techStack: p.techStack,
    }));

    return {
      developerId: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      overallScore: developer.hiringReport.overallScore,
      projectCount: developer.projects.length,
      techStack,
      juniorLevel: developer.hiringReport.juniorLevel,
      projects,
      isUnlocked,
      assessedAt: developer.hiringReport.generatedAt,
    };
  }

  /**
   * Unlock a developer's report (costs 1 credit)
   */
  async unlockReport(
    companyId: number,
    developerId: number,
  ): Promise<UnlockReportResponseDto> {
    // Check if developer exists and is assessed
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: { hiringReport: true },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    if (developer.assessmentStatus !== AssessmentStatus.ASSESSED) {
      throw new BadRequestException(
        'Cannot unlock report for a developer who is not fully assessed',
      );
    }

    if (!developer.hiringReport) {
      throw new BadRequestException(
        'Hiring report not yet generated for this developer',
      );
    }

    // Check if already unlocked
    const existingUnlock = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (existingUnlock) {
      throw new BadRequestException(
        'You have already unlocked this developer report',
      );
    }

    // Check if company has enough credits
    const hasCredits = await this.creditService.hasEnoughCredits(companyId, 1);
    if (!hasCredits) {
      throw new BadRequestException(
        'Insufficient credits. Please purchase more credits to unlock this report.',
      );
    }

    // Deduct credit (this creates the credit transaction)
    const { newBalance } = await this.creditService.deductCredit(
      companyId,
      developerId,
    );

    // Create unlock record
    await this.prisma.unlockedReport.create({
      data: {
        companyId,
        developerId,
      },
    });

    // Update pipeline stage if there's a pipeline entry for this company-developer
    await this.prisma.pipelineEntry.upsert({
      where: {
        companyId_developerId: { companyId, developerId },
      },
      create: {
        companyId,
        developerId,
        stage: PipelineStage.UNLOCKED,
      },
      update: {
        stage: PipelineStage.UNLOCKED,
      },
    });

    return {
      success: true,
      message: 'Report unlocked successfully',
      newBalance,
      developerId,
    };
  }

  /**
   * Get full report (requires unlock)
   */
  async getFullReport(
    companyId: number,
    developerId: number,
  ): Promise<FullReportDto> {
    // Check if unlocked
    const unlock = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (!unlock) {
      throw new ForbiddenException(
        'You have not unlocked this report. Please unlock it first.',
      );
    }

    // Get developer with all related data
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        projects: {
          include: {
            analysis: true,
          },
        },
        hiringReport: true,
        techExperiences: {
          orderBy: { months: 'desc' },
        },
      },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    if (!developer.hiringReport) {
      throw new NotFoundException('Hiring report not found');
    }

    // Map developer profile
    const developerProfile: DeveloperProfileDto = {
      id: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      location: developer.location,
      techExperiences: developer.techExperiences.map((exp) => ({
        stackName: exp.stackName,
        months: exp.months,
      })),
    };

    // Map project analyses
    const projectAnalyses: ProjectAnalysisDto[] = developer.projects
      .filter(
        (p) =>
          p.analysis && p.analysis.status === ProjectAnalysisStatus.COMPLETE,
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        githubUrl: p.githubUrl,
        projectType: p.projectType,
        description: p.description,
        techStack: p.techStack,
        score: p.analysis!.score ?? 0,
        strengths: p.analysis!.strengths,
        areasForImprovement: p.analysis!.areasForImprovement,
        codeOrganization: p.analysis!.codeOrganization,
        bestPractices: p.analysis!.bestPractices,
        completedAt: p.analysis!.completedAt ?? p.analysis!.createdAt,
      }));

    // Map hiring report
    const hiringReport: HiringReportDto = {
      overallScore: developer.hiringReport.overallScore,
      juniorLevel: developer.hiringReport.juniorLevel,
      aggregateStrengths: developer.hiringReport.aggregateStrengths,
      aggregateWeaknesses: developer.hiringReport.aggregateWeaknesses,
      interviewQuestions: developer.hiringReport.interviewQuestions,
      onboardingAreas: developer.hiringReport.onboardingAreas,
      mentoringNeeds: developer.hiringReport.mentoringNeeds,
      techProficiency: developer.hiringReport.techProficiency as Record<
        string,
        number
      > | null,
      redFlags: developer.hiringReport.redFlags,
      growthPotential: developer.hiringReport.growthPotential,
      recommendation: developer.hiringReport.recommendation,
      conclusion: developer.hiringReport.conclusion,
      generatedAt: developer.hiringReport.generatedAt,
    };

    return {
      developer: developerProfile,
      projectAnalyses,
      hiringReport,
      unlockedAt: unlock.unlockedAt,
    };
  }

  /**
   * Get report - returns full if unlocked, preview if not
   */
  async getReport(
    companyId: number,
    developerId: number,
  ): Promise<{
    type: 'preview' | 'full';
    data: ReportPreviewDto | FullReportDto;
  }> {
    const isUnlocked = await this.isReportUnlocked(companyId, developerId);

    if (isUnlocked) {
      const data = await this.getFullReport(companyId, developerId);
      return { type: 'full', data };
    } else {
      const data = await this.getReportPreview(companyId, developerId);
      return { type: 'preview', data };
    }
  }
}
