import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * NotificationService handles event-based notifications
 * It decides when and to whom notifications should be sent
 */
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Notify companies when a developer they're tracking completes assessment
   */
  async notifyCompaniesOfAssessmentComplete(
    developerId: number,
  ): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: { user: { select: { email: true } } },
    });

    if (!developer) return;

    const developerName =
      [developer.firstName, developer.lastName].filter(Boolean).join(' ') ||
      developer.user.email;

    // Find all companies tracking this developer (via pipeline or invitations)
    const pipelineEntries = await this.prisma.pipelineEntry.findMany({
      where: {
        developerId,
        stage: {
          notIn: ['UNLOCKED', 'HIRED', 'REJECTED'],
        },
      },
      include: {
        company: {
          select: {
            user: { select: { email: true } },
            name: true,
            emailNotifications: true,
          },
        },
      },
    });

    // Send notifications to each company (if they have email notifications enabled)
    for (const entry of pipelineEntries) {
      if (entry.company.emailNotifications) {
        try {
          await this.emailService.sendAssessmentCompleteEmail(
            entry.company.user.email,
            entry.company.name,
            developerName,
            developer.user.email,
          );
        } catch (error) {
          console.error(
            `Failed to send assessment complete email to ${entry.company.user.email}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Notify developer when their project analysis is complete
   */
  async notifyDeveloperOfProjectAnalysis(projectId: number): Promise<void> {
    const project = await this.prisma.technicalProject.findUnique({
      where: { id: projectId },
      include: {
        analysis: true,
        developer: { include: { user: { select: { email: true } } } },
      },
    });

    if (!project || !project.analysis || project.analysis.score === null) {
      return;
    }

    const developerName =
      [project.developer.firstName, project.developer.lastName]
        .filter(Boolean)
        .join(' ') || 'Developer';

    try {
      await this.emailService.sendProjectAnalysisCompleteEmail(
        project.developer.user.email,
        developerName,
        project.name,
        project.analysis.score,
      );
    } catch (error) {
      console.error(
        `Failed to send project analysis email to ${project.developer.user.email}:`,
        error,
      );
    }
  }

  /**
   * Notify developer when all projects are analyzed
   */
  async notifyDeveloperOfAllProjectsAnalyzed(
    developerId: number,
  ): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        projects: {
          include: {
            analysis: true,
          },
        },
        user: true,
      },
    });

    if (!developer || developer.projects.length === 0) return;

    const completedProjects = developer.projects.filter(
      (p) => p.analysis?.status === 'COMPLETE' && p.analysis.score !== null,
    );

    if (completedProjects.length === 0) return;

    const averageScore = Math.round(
      completedProjects.reduce((sum, p) => sum + (p.analysis?.score || 0), 0) /
        completedProjects.length,
    );

    const developerName =
      [developer.firstName, developer.lastName].filter(Boolean).join(' ') ||
      'Developer';

    try {
      await this.emailService.sendAllProjectsAnalyzedEmail(
        developer.user.email,
        developerName,
        completedProjects.length,
        averageScore,
      );
    } catch (error) {
      console.error(
        `Failed to send all projects analyzed email to ${developer.user.email}:`,
        error,
      );
    }
  }

  /**
   * Notify developer when a company unlocks their report
   */
  async notifyDeveloperOfReportUnlock(
    developerId: number,
    companyId: number,
  ): Promise<void> {
    const [developer, company] = await Promise.all([
      this.prisma.developer.findUnique({
        where: { id: developerId },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.company.findUnique({ where: { id: companyId } }),
    ]);

    if (!developer || !company) return;

    const developerName =
      [developer.firstName, developer.lastName].filter(Boolean).join(' ') ||
      'Developer';

    try {
      await this.emailService.sendReportUnlockedEmail(
        developer.user.email,
        developerName,
        company.name,
      );
    } catch (error) {
      console.error(
        `Failed to send report unlocked email to ${developer.user.email}:`,
        error,
      );
    }
  }

  /**
   * Send low credits warning to company
   */
  async sendLowCreditsWarning(companyId: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: { select: { email: true } } },
    });

    if (!company || !company.emailNotifications) return;

    // Only warn if credits are 1 or 0
    if (company.creditBalance > 1) return;

    try {
      await this.emailService.sendLowCreditsWarningEmail(
        company.user.email,
        company.name,
        company.creditBalance,
      );
    } catch (error) {
      console.error(
        `Failed to send low credits warning to ${company.user.email}:`,
        error,
      );
    }
  }

  /**
   * Send welcome email to new company
   */
  async sendCompanyWelcome(companyId: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { user: { select: { email: true } } },
    });

    if (!company) return;

    try {
      await this.emailService.sendWelcomeEmail(
        company.user.email,
        company.name,
        true,
      );
    } catch (error) {
      console.error(
        `Failed to send welcome email to company ${company.user.email}:`,
        error,
      );
    }
  }

  /**
   * Send welcome email to new developer
   */
  async sendDeveloperWelcome(developerId: number): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: { user: { select: { email: true } } },
    });

    if (!developer) return;

    const name =
      [developer.firstName, developer.lastName].filter(Boolean).join(' ') ||
      'Developer';

    try {
      await this.emailService.sendWelcomeEmail(
        developer.user.email,
        name,
        false,
      );
    } catch (error) {
      console.error(
        `Failed to send welcome email to developer ${developer.user.email}:`,
        error,
      );
    }
  }
}
