import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import {
  CreateInvitationDto,
  InvitationResponseDto,
  InvitationListDto,
  InvitationStatusDto,
  DeveloperStatusDto,
  DeveloperStatusType,
} from './dto';
import {
  InvitationStatus,
  PipelineStage,
} from '../../../prisma/generated/prisma';

@Injectable()
export class InvitationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createInvitation(
    companyId: number,
    dto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    const email = dto.candidateEmail.toLowerCase();

    // Check if invitation already exists for this company+email
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        companyId,
        candidateEmail: email,
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'An active invitation already exists for this email',
      );
    }

    // Get company info for email
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if developer already exists
    const developer = await this.prisma.developer.findUnique({
      where: { email },
    });

    // For non-registered developers, we always send an email since that's the only way to reach them
    const shouldSendEmail = dto.sendEmail || !developer;

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        companyId,
        candidateEmail: email,
        message: dto.message,
        expiresAt,
        status: shouldSendEmail
          ? InvitationStatus.PENDING
          : InvitationStatus.TRACKED,
        sentAt: shouldSendEmail ? new Date() : null,
      },
    });

    // Send email if needed (async, don't block)
    if (shouldSendEmail) {
      this.emailService
        .sendInvitationEmail(email, company.name, invitation.token, dto.message)
        .catch((err) => console.error('Failed to send invitation email:', err));
    }

    if (developer) {
      // Developer already registered, create pipeline entry
      await this.prisma.pipelineEntry.upsert({
        where: {
          companyId_developerId: {
            companyId,
            developerId: developer.id,
          },
        },
        create: {
          companyId,
          developerId: developer.id,
          stage: this.mapAssessmentStatusToPipelineStage(
            developer.assessmentStatus,
          ),
        },
        update: {}, // Don't update if already exists
      });
    }

    return this.mapToResponseDto(invitation);
  }

  async getCompanyInvitations(
    companyId: number,
    limit = 50,
    offset = 0,
    status?: InvitationStatusDto,
  ): Promise<InvitationListDto> {
    const where = {
      companyId,
      ...(status && { status: status as InvitationStatus }),
    };

    const [invitations, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.invitation.count({ where }),
    ]);

    // Check for expired invitations and update them
    const now = new Date();
    for (const inv of invitations) {
      if (inv.status === InvitationStatus.PENDING && inv.expiresAt < now) {
        await this.prisma.invitation.update({
          where: { id: inv.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        inv.status = InvitationStatus.EXPIRED;
      }
    }

    return {
      invitations: invitations.map((inv) => this.mapToResponseDto(inv)),
      total,
    };
  }

  async getDeveloperStatus(
    companyId: number,
    email: string,
  ): Promise<DeveloperStatusDto> {
    const normalizedEmail = email.toLowerCase();

    // Check if developer exists
    const developer = await this.prisma.developer.findUnique({
      where: { email: normalizedEmail },
      include: {
        projects: {
          include: { analysis: true },
        },
        hiringReport: true,
      },
    });

    // Check if company has unlocked this developer
    const unlocked = developer
      ? await this.prisma.unlockedReport.findUnique({
          where: {
            companyId_developerId: {
              companyId,
              developerId: developer.id,
            },
          },
        })
      : null;

    // Check if company is tracking this candidate
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        companyId,
        candidateEmail: normalizedEmail,
      },
    });

    if (!developer) {
      return {
        exists: false,
        status: DeveloperStatusType.NOT_REGISTERED,
        statusDescription: 'Not registered on Juniob',
        email: normalizedEmail,
        isUnlocked: false,
        isTracked: !!invitation,
      };
    }

    // Check visibility - if developer is not visible and company hasn't unlocked them,
    // treat as if they don't exist (privacy protection)
    if (!developer.isVisible && !unlocked) {
      return {
        exists: false,
        status: DeveloperStatusType.NOT_REGISTERED,
        statusDescription: 'Not registered on Juniob',
        email: normalizedEmail,
        isUnlocked: false,
        isTracked: !!invitation,
      };
    }

    // Map assessment status to developer status type
    const statusType = this.mapAssessmentStatusToType(
      developer.assessmentStatus,
    );
    const statusDescription = this.getStatusDescription(statusType);

    // Collect tech stack from all projects
    const techStack = developer.projects.flatMap((p) => p.techStack);
    const uniqueTechStack = [...new Set(techStack)];

    // Count analyzed projects
    const analyzedProjects = developer.projects.filter(
      (p) => p.analysis?.status === 'COMPLETE',
    );

    return {
      exists: true,
      status: statusType,
      statusDescription,
      developerId: developer.id,
      name:
        developer.firstName && developer.lastName
          ? `${developer.firstName} ${developer.lastName}`
          : developer.firstName || undefined,
      email: developer.email,
      isUnlocked: !!unlocked,
      isTracked: !!invitation,
      overallScore: developer.hiringReport?.overallScore,
      projectCount: analyzedProjects.length,
      techStack: uniqueTechStack.length > 0 ? uniqueTechStack : undefined,
    };
  }

  async resendInvitation(
    companyId: number,
    invitationId: number,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, companyId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Cannot resend - invitation already accepted',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Update expiration and sent timestamp
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        expiresAt,
        sentAt: new Date(),
        status: InvitationStatus.PENDING,
      },
    });

    // Send email
    this.emailService
      .sendInvitationEmail(
        invitation.candidateEmail,
        company.name,
        invitation.token,
        invitation.message ?? undefined,
      )
      .catch((err) => console.error('Failed to send invitation email:', err));

    return this.mapToResponseDto(updated);
  }

  async deleteInvitation(
    companyId: number,
    invitationId: number,
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, companyId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot delete accepted invitation');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });
  }

  private mapToResponseDto(invitation: {
    id: number;
    candidateEmail: string;
    status: InvitationStatus;
    message: string | null;
    expiresAt: Date;
    sentAt: Date | null;
    acceptedAt: Date | null;
    createdAt: Date;
    developerId: number | null;
  }): InvitationResponseDto {
    return {
      id: invitation.id,
      candidateEmail: invitation.candidateEmail,
      status: invitation.status as InvitationStatusDto,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      sentAt: invitation.sentAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      developerId: invitation.developerId,
    };
  }

  private mapAssessmentStatusToType(status: string): DeveloperStatusType {
    switch (status) {
      case 'REGISTERING':
        return DeveloperStatusType.REGISTERING;
      case 'PROJECTS_SUBMITTED':
        return DeveloperStatusType.PROJECTS_SUBMITTED;
      case 'ANALYZING':
        return DeveloperStatusType.ANALYZING;
      case 'PENDING_ANALYSIS':
        return DeveloperStatusType.PENDING_ANALYSIS;
      case 'ASSESSED':
        return DeveloperStatusType.ASSESSED;
      default:
        return DeveloperStatusType.REGISTERING;
    }
  }

  private mapAssessmentStatusToPipelineStage(status: string): PipelineStage {
    switch (status) {
      case 'REGISTERING':
        return PipelineStage.REGISTERING;
      case 'PROJECTS_SUBMITTED':
        return PipelineStage.PROJECTS_SUBMITTED;
      case 'ANALYZING':
        return PipelineStage.ANALYZING;
      case 'PENDING_ANALYSIS':
        return PipelineStage.PENDING_ANALYSIS;
      case 'ASSESSED':
        return PipelineStage.ASSESSED;
      default:
        return PipelineStage.INVITED;
    }
  }

  private getStatusDescription(status: DeveloperStatusType): string {
    switch (status) {
      case DeveloperStatusType.NOT_REGISTERED:
        return 'Not registered on Juniob';
      case DeveloperStatusType.REGISTERING:
        return 'Creating their profile...';
      case DeveloperStatusType.PROJECTS_SUBMITTED:
        return 'Projects submitted, waiting for analysis';
      case DeveloperStatusType.ANALYZING:
        return 'Analysis in progress (typically 5-10 minutes)';
      case DeveloperStatusType.PENDING_ANALYSIS:
        return 'Waiting for developer to regenerate report';
      case DeveloperStatusType.ASSESSED:
        return 'Assessment complete - ready to unlock';
      default:
        return 'Unknown status';
    }
  }
}
