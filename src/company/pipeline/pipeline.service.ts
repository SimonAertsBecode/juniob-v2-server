import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { PipelineStage } from '../../../prisma/generated/prisma';
import {
  PipelineEntryDto,
  PipelineDeveloperDto,
  PipelineTagDto,
  PipelineListDto,
  PipelineStatsDto,
  PipelineQueryDto,
  CreateInvitationDto,
  UpdateNotesDto,
  InvitationInfoDto,
} from './dto';

// Type for pipeline entry with includes used in mapping (registered developers)
type PipelineEntryWithDeveloper = {
  id: number;
  companyId: number;
  developerId: number | null;
  candidateEmail: string | null;
  invitationToken: string | null;
  invitationMessage: string | null;
  invitedAt: Date | null;
  tokenExpiresAt: Date | null;
  stage: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  developer: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    assessmentStatus: string;
    projects: { techStack: string[] }[];
    hiringReport: { overallScore: number } | null;
  } | null;
  tags: {
    tag: { id: number; name: string; color: string };
  }[];
};

@Injectable()
export class PipelineService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Compute invitation status from entry data
   */
  private computeInvitationStatus(
    entry: Pick<
      PipelineEntryWithDeveloper,
      'developerId' | 'invitedAt' | 'tokenExpiresAt' | 'stage'
    >,
  ): 'PENDING' | 'EXPIRED' | 'TRACKED' | undefined {
    // Only for entries without a developer (pending invitations)
    if (entry.developerId !== null) {
      return undefined;
    }

    // If stage is not INVITED, not a pending invitation
    if (entry.stage !== 'INVITED') {
      return undefined;
    }

    // TRACKED: no email was sent
    if (!entry.invitedAt) {
      return 'TRACKED';
    }

    // EXPIRED: token has expired
    if (entry.tokenExpiresAt && new Date(entry.tokenExpiresAt) < new Date()) {
      return 'EXPIRED';
    }

    // PENDING: email was sent and token is still valid
    return 'PENDING';
  }

  /**
   * Map a pipeline entry with includes to DTO format
   */
  private mapEntryToDto(
    entry: PipelineEntryWithDeveloper,
    isUnlocked: boolean,
  ): PipelineEntryDto {
    const isPendingInvitation = entry.developerId === null;
    const invitationStatus = this.computeInvitationStatus(entry);

    // For pending invitations, create a virtual developer object
    const developer: PipelineDeveloperDto = isPendingInvitation
      ? {
          id: entry.id, // Use entry ID as identifier
          email: entry.candidateEmail || '',
          firstName: undefined,
          lastName: undefined,
          assessmentStatus: 'NOT_REGISTERED',
          overallScore: undefined,
          techStack: [],
          projectCount: 0,
        }
      : {
          id: entry.developer!.id,
          email: entry.developer!.email,
          firstName: entry.developer!.firstName || undefined,
          lastName: entry.developer!.lastName || undefined,
          assessmentStatus: entry.developer!.assessmentStatus,
          overallScore:
            entry.developer!.hiringReport?.overallScore || undefined,
          techStack: [
            ...new Set(
              entry.developer!.projects.flatMap((p) => p.techStack),
            ),
          ],
          projectCount: entry.developer!.projects.length,
        };

    const tags: PipelineTagDto[] = entry.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      color: pt.tag.color,
    }));

    return {
      id: entry.id,
      companyId: entry.companyId,
      developerId: entry.developerId || undefined,
      stage: entry.stage,
      notes: entry.notes || undefined,
      isUnlocked: isPendingInvitation ? false : isUnlocked,
      developer,
      tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      // Invitation fields
      candidateEmail: entry.candidateEmail || undefined,
      invitationToken: entry.invitationToken || undefined,
      invitationMessage: entry.invitationMessage || undefined,
      invitedAt: entry.invitedAt || undefined,
      tokenExpiresAt: entry.tokenExpiresAt || undefined,
      // Computed fields
      isPendingInvitation,
      invitationStatus,
    };
  }

  /**
   * Get pipeline entries for a company (flat list with pagination)
   * Now unified - includes both registered developers and pending invitations
   */
  async getPipeline(
    companyId: number,
    query: PipelineQueryDto,
  ): Promise<PipelineListDto> {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;
    const sortBy = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = { companyId };

    // Filter by stage if provided
    if (query.stage) {
      where.stage = query.stage as PipelineStage;
    }

    // Filter by tags if provided
    if (query.tagIds) {
      const tagIdArray = query.tagIds
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
      if (tagIdArray.length > 0) {
        where.tags = {
          some: {
            tagId: { in: tagIdArray },
          },
        };
      }
    }

    // Search by email (both registered developers and pending invitations)
    if (query.search) {
      where.OR = [
        // Search in developer's user email
        {
          developer: {
            user: {
              email: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          },
        },
        // Search in candidateEmail for pending invitations
        {
          candidateEmail: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Filter: for registered developers, only show visible ones
    // For pending invitations (developerId is null), always show
    where.OR = where.OR
      ? [
          ...where.OR.map((condition: any) => ({
            ...condition,
            AND: [
              {
                OR: [
                  { developerId: null },
                  { developer: { isVisible: true } },
                ],
              },
            ],
          })),
        ]
      : undefined;

    if (!where.OR) {
      where.OR = [{ developerId: null }, { developer: { isVisible: true } }];
    }

    const [entries, total] = await Promise.all([
      this.prisma.pipelineEntry.findMany({
        where,
        include: {
          developer: {
            include: {
              user: true,
              projects: {
                select: { techStack: true },
              },
              hiringReport: {
                select: { overallScore: true },
              },
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.pipelineEntry.count({ where }),
    ]);

    // Get unlocked reports for registered developers
    const developerIds = entries
      .filter((e) => e.developerId !== null)
      .map((e) => e.developerId!);

    const unlockedReports =
      developerIds.length > 0
        ? await this.prisma.unlockedReport.findMany({
            where: {
              companyId,
              developerId: { in: developerIds },
            },
            select: { developerId: true },
          })
        : [];

    const unlockedSet = new Set(unlockedReports.map((u) => u.developerId));

    const mappedEntries: PipelineEntryDto[] = entries.map((entry) =>
      this.mapEntryToDto(
        {
          ...entry,
          developer: entry.developer
            ? {
                ...entry.developer,
                email: entry.developer.user.email,
              }
            : null,
        },
        entry.developerId ? unlockedSet.has(entry.developerId) : false,
      ),
    );

    return {
      entries: mappedEntries,
      total,
      offset,
      limit,
    };
  }

  /**
   * Get pipeline statistics (count per stage)
   * Now unified - counts include both registered developers and pending invitations
   */
  async getPipelineStats(companyId: number): Promise<PipelineStatsDto> {
    const counts = await this.prisma.pipelineEntry.groupBy({
      by: ['stage'],
      where: {
        companyId,
        OR: [{ developerId: null }, { developer: { isVisible: true } }],
      },
      _count: true,
    });

    const statsMap = new Map(counts.map((c) => [c.stage, c._count]));
    const total = counts.reduce((sum, c) => sum + c._count, 0);

    return {
      invited: statsMap.get('INVITED') || 0,
      registering: statsMap.get('REGISTERING') || 0,
      projectsSubmitted: statsMap.get('PROJECTS_SUBMITTED') || 0,
      analyzing: statsMap.get('ANALYZING') || 0,
      pendingAnalysis: statsMap.get('PENDING_ANALYSIS') || 0,
      assessed: statsMap.get('ASSESSED') || 0,
      unlocked: statsMap.get('UNLOCKED') || 0,
      hired: statsMap.get('HIRED') || 0,
      rejected: statsMap.get('REJECTED') || 0,
      total,
    };
  }

  /**
   * Create an invitation (track candidate)
   */
  async createInvitation(
    companyId: number,
    dto: CreateInvitationDto,
  ): Promise<PipelineEntryDto> {
    const email = dto.candidateEmail.toLowerCase();

    // Check if entry already exists for this company+email
    const existingEntry = await this.prisma.pipelineEntry.findFirst({
      where: {
        companyId,
        OR: [
          { candidateEmail: email },
          { developer: { user: { email } } },
        ],
      },
    });

    if (existingEntry) {
      throw new ConflictException(
        'This candidate is already being tracked in your pipeline',
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
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { developer: true },
    });

    const sendEmail = dto.sendEmail !== false;

    if (existingUser?.developer) {
      // Developer already registered - create pipeline entry with developerId
      const entry = await this.prisma.pipelineEntry.create({
        data: {
          companyId,
          developerId: existingUser.developer.id,
          stage: this.mapAssessmentStatusToPipelineStage(
            existingUser.developer.assessmentStatus,
          ),
          invitationMessage: dto.message,
          invitedAt: sendEmail ? new Date() : null,
        },
        include: {
          developer: {
            include: {
              user: true,
              projects: { select: { techStack: true } },
              hiringReport: { select: { overallScore: true } },
            },
          },
          tags: { include: { tag: true } },
        },
      });

      // Send notification email if requested
      if (sendEmail) {
        this.emailService
          .sendInvitationEmail(
            email,
            company.name,
            entry.invitationToken || '',
            dto.message,
          )
          .catch((err) =>
            console.error('Failed to send invitation email:', err),
          );
      }

      // Check if unlocked
      const unlocked = await this.prisma.unlockedReport.findUnique({
        where: {
          companyId_developerId: {
            companyId,
            developerId: existingUser.developer.id,
          },
        },
      });

      return this.mapEntryToDto(
        {
          ...entry,
          developer: entry.developer
            ? {
                ...entry.developer,
                email: entry.developer.user.email,
              }
            : null,
        },
        !!unlocked,
      );
    }

    // Developer not registered - create pending invitation entry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const entry = await this.prisma.pipelineEntry.create({
      data: {
        companyId,
        developerId: null,
        candidateEmail: email,
        invitationMessage: dto.message,
        invitedAt: sendEmail ? new Date() : null,
        tokenExpiresAt: sendEmail ? expiresAt : null,
        stage: 'INVITED',
      },
      include: {
        developer: {
          include: {
            user: true,
            projects: { select: { techStack: true } },
            hiringReport: { select: { overallScore: true } },
          },
        },
        tags: { include: { tag: true } },
      },
    });

    // Send invitation email if requested
    if (sendEmail) {
      this.emailService
        .sendInvitationEmail(
          email,
          company.name,
          entry.invitationToken || '',
          dto.message,
        )
        .catch((err) =>
          console.error('Failed to send invitation email:', err),
        );
    }

    return this.mapEntryToDto(
      {
        ...entry,
        developer: null,
      },
      false,
    );
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(
    companyId: number,
    entryId: number,
  ): Promise<PipelineEntryDto> {
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: entryId, companyId },
      include: {
        developer: {
          include: {
            user: true,
            projects: { select: { techStack: true } },
            hiringReport: { select: { overallScore: true } },
          },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    // Can only resend for pending invitations
    if (entry.developerId !== null) {
      throw new BadRequestException(
        'Cannot resend invitation - candidate already registered',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Update expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const updated = await this.prisma.pipelineEntry.update({
      where: { id: entryId },
      data: {
        invitedAt: new Date(),
        tokenExpiresAt: expiresAt,
      },
      include: {
        developer: {
          include: {
            user: true,
            projects: { select: { techStack: true } },
            hiringReport: { select: { overallScore: true } },
          },
        },
        tags: { include: { tag: true } },
      },
    });

    // Send email
    this.emailService
      .sendInvitationEmail(
        entry.candidateEmail!,
        company.name,
        updated.invitationToken || '',
        entry.invitationMessage || undefined,
      )
      .catch((err) => console.error('Failed to send invitation email:', err));

    return this.mapEntryToDto(
      {
        ...updated,
        developer: null,
      },
      false,
    );
  }

  /**
   * Update notes for a pipeline entry
   */
  async updateNotes(
    companyId: number,
    entryId: number,
    dto: UpdateNotesDto,
  ): Promise<PipelineEntryDto> {
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: entryId, companyId },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    const updated = await this.prisma.pipelineEntry.update({
      where: { id: entryId },
      data: { notes: dto.notes },
      include: {
        developer: {
          include: {
            user: true,
            projects: { select: { techStack: true } },
            hiringReport: { select: { overallScore: true } },
          },
        },
        tags: { include: { tag: true } },
      },
    });

    // Check if unlocked (only for registered developers)
    let isUnlocked = false;
    if (updated.developerId) {
      const unlocked = await this.prisma.unlockedReport.findUnique({
        where: {
          companyId_developerId: {
            companyId,
            developerId: updated.developerId,
          },
        },
      });
      isUnlocked = !!unlocked;
    }

    return this.mapEntryToDto(
      {
        ...updated,
        developer: updated.developer
          ? {
              ...updated.developer,
              email: updated.developer.user.email,
            }
          : null,
      },
      isUnlocked,
    );
  }

  /**
   * Get invitation info by token (public endpoint for accept page)
   */
  async getInvitationByToken(token: string): Promise<InvitationInfoDto> {
    const entry = await this.prisma.pipelineEntry.findUnique({
      where: { invitationToken: token },
      include: {
        company: { select: { name: true } },
      },
    });

    if (!entry) {
      return { valid: false, error: 'Invalid invitation token' };
    }

    // Check if already registered
    if (entry.developerId !== null) {
      return { valid: false, error: 'This invitation has already been used' };
    }

    // Check expiration
    const isExpired =
      entry.tokenExpiresAt && new Date(entry.tokenExpiresAt) < new Date();
    if (isExpired) {
      return {
        valid: false,
        expired: true,
        error: 'This invitation has expired',
      };
    }

    return {
      valid: true,
      email: entry.candidateEmail || undefined,
      companyName: entry.company.name,
      message: entry.invitationMessage || undefined,
      expired: false,
    };
  }

  /**
   * Link developer to all pending pipeline entries for their email
   * Called when a developer registers
   */
  async linkDeveloperToEntries(
    email: string,
    developerId: number,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // Find all pending entries for this email
    const pendingEntries = await this.prisma.pipelineEntry.findMany({
      where: {
        candidateEmail: normalizedEmail,
        developerId: null,
      },
    });

    // Update each entry to link to the developer
    for (const entry of pendingEntries) {
      await this.prisma.pipelineEntry.update({
        where: { id: entry.id },
        data: {
          developerId,
          stage: 'REGISTERING',
          invitationToken: null, // Clear token
        },
      });
    }
  }

  /**
   * Update pipeline stage (only HIRED or REJECTED can be manually set)
   */
  async updateStage(
    companyId: number,
    entryId: number,
    stage: 'HIRED' | 'REJECTED',
  ): Promise<PipelineEntryDto> {
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: entryId, companyId },
      include: {
        developer: {
          select: { isVisible: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    // Cannot change stage for pending invitations
    if (entry.developerId === null) {
      throw new BadRequestException(
        'Cannot change stage for pending invitation',
      );
    }

    // Check visibility - developer must be visible to companies
    if (entry.developer && !entry.developer.isVisible) {
      throw new ForbiddenException(
        'Developer profile is not visible to companies',
      );
    }

    const updated = await this.prisma.pipelineEntry.update({
      where: { id: entryId },
      data: { stage },
      include: {
        developer: {
          include: {
            projects: {
              select: { techStack: true },
            },
            hiringReport: {
              select: { overallScore: true },
            },
            user: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Check if unlocked
    const unlocked = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId: entry.developerId! },
      },
    });

    return this.mapEntryToDto(
      {
        ...updated,
        developer: updated.developer
          ? {
              ...updated.developer,
              email: updated.developer.user.email,
            }
          : null,
      },
      !!unlocked,
    );
  }

  /**
   * Remove entry from pipeline
   */
  async removeFromPipeline(companyId: number, entryId: number): Promise<void> {
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: entryId, companyId },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    await this.prisma.pipelineEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Get single pipeline entry by ID
   */
  async getPipelineEntry(
    companyId: number,
    entryId: number,
  ): Promise<PipelineEntryDto | null> {
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: entryId, companyId },
      include: {
        developer: {
          include: {
            projects: {
              select: { techStack: true },
            },
            hiringReport: {
              select: { overallScore: true },
            },
            user: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!entry) {
      return null;
    }

    // Check visibility for registered developers
    if (entry.developer && !entry.developer.isVisible) {
      return null;
    }

    // Check if unlocked
    let isUnlocked = false;
    if (entry.developerId) {
      const unlocked = await this.prisma.unlockedReport.findUnique({
        where: {
          companyId_developerId: { companyId, developerId: entry.developerId },
        },
      });
      isUnlocked = !!unlocked;
    }

    return this.mapEntryToDto(
      {
        ...entry,
        developer: entry.developer
          ? {
              ...entry.developer,
              email: entry.developer.user.email,
            }
          : null,
      },
      isUnlocked,
    );
  }

  /**
   * Get single pipeline entry by developer ID (for backward compatibility)
   */
  async getPipelineEntryByDeveloperId(
    companyId: number,
    developerId: number,
  ): Promise<PipelineEntryDto | null> {
    const entry = await this.prisma.pipelineEntry.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
      include: {
        developer: {
          include: {
            projects: {
              select: { techStack: true },
            },
            hiringReport: {
              select: { overallScore: true },
            },
            user: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!entry) {
      return null;
    }

    // Check visibility
    if (entry.developer && !entry.developer.isVisible) {
      return null;
    }

    // Check if unlocked
    const unlocked = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    return this.mapEntryToDto(
      {
        ...entry,
        developer: entry.developer
          ? {
              ...entry.developer,
              email: entry.developer.user.email,
            }
          : null,
      },
      !!unlocked,
    );
  }

  /**
   * Sync pipeline stage with developer's assessment status
   * Called internally when developer status changes
   */
  async syncPipelineStage(developerId: number): Promise<void> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      return;
    }

    // Map assessment status to pipeline stage
    let newStage: PipelineStage;
    switch (developer.assessmentStatus) {
      case 'REGISTERING':
        newStage = 'REGISTERING';
        break;
      case 'PROJECTS_SUBMITTED':
        newStage = 'PROJECTS_SUBMITTED';
        break;
      case 'ANALYZING':
        newStage = 'ANALYZING';
        break;
      case 'PENDING_ANALYSIS':
        newStage = 'PENDING_ANALYSIS';
        break;
      case 'ASSESSED':
        newStage = 'ASSESSED';
        break;
      default:
        return;
    }

    // Update all pipeline entries for this developer
    // But only if they're not already in UNLOCKED, HIRED, or REJECTED
    await this.prisma.pipelineEntry.updateMany({
      where: {
        developerId,
        stage: {
          notIn: ['UNLOCKED', 'HIRED', 'REJECTED'],
        },
      },
      data: { stage: newStage },
    });
  }

  /**
   * Set tags for a pipeline entry (replace all existing tags)
   */
  async setTags(
    companyId: number,
    entryId: number,
    tagIds: number[],
  ): Promise<PipelineEntryDto> {
    // Find the pipeline entry
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: entryId, companyId },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    // Verify all tags belong to this company
    if (tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          companyId,
        },
      });

      if (tags.length !== tagIds.length) {
        throw new BadRequestException('One or more tags not found');
      }
    }

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Delete existing tag assignments
      await tx.pipelineEntryTag.deleteMany({
        where: { pipelineEntryId: entry.id },
      });

      // Create new tag assignments
      if (tagIds.length > 0) {
        await tx.pipelineEntryTag.createMany({
          data: tagIds.map((tagId) => ({
            pipelineEntryId: entry.id,
            tagId,
          })),
        });
      }
    });

    // Return updated entry
    return this.getPipelineEntry(companyId, entryId) as Promise<PipelineEntryDto>;
  }

  /**
   * Helper to map assessment status to pipeline stage
   */
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
}
