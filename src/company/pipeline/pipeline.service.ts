import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PipelineStage,
  InvitationStatus,
} from '../../../prisma/generated/prisma';
import {
  PipelineEntryDto,
  PipelineDeveloperDto,
  PipelineTagDto,
  PipelineListDto,
  PipelineGroupedDto,
  PipelineStatsDto,
  PipelineQueryDto,
} from './dto';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get pending invitations (unregistered candidates) for pipeline display
   * These are invitations where developerId is NULL (candidate hasn't registered yet)
   */
  private async getPendingInvitationsForPipeline(
    companyId: number,
    search?: string,
  ): Promise<PipelineEntryDto[]> {
    const where: any = {
      companyId,
      developerId: null, // No developer attached = unregistered
      status: {
        in: [InvitationStatus.PENDING, InvitationStatus.EXPIRED],
      },
    };

    // Search by candidate email if provided
    if (search) {
      where.candidateEmail = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const invitations = await this.prisma.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Map invitations to PipelineEntryDto format
    return invitations.map((inv) => {
      const isExpired =
        inv.status === InvitationStatus.EXPIRED ||
        new Date(inv.expiresAt) < new Date();

      const developer: PipelineDeveloperDto = {
        id: -inv.id, // Negative ID to distinguish from real developers
        email: inv.candidateEmail,
        firstName: undefined,
        lastName: undefined,
        assessmentStatus: 'NOT_REGISTERED',
        overallScore: undefined,
        techStack: [],
        projectCount: 0,
      };

      return {
        id: -inv.id, // Negative ID to distinguish from real pipeline entries
        companyId: inv.companyId,
        developerId: -inv.id, // Negative ID
        stage: 'INVITED',
        notes: inv.message || undefined,
        isUnlocked: false,
        developer,
        tags: [],
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        // Virtual fields for pending invitations
        isPendingInvitation: true,
        invitationId: inv.id,
        invitationStatus: isExpired ? 'EXPIRED' : 'PENDING',
      };
    });
  }

  /**
   * Get pipeline entries for a company (flat list with pagination)
   */
  async getPipeline(
    companyId: number,
    query: PipelineQueryDto,
  ): Promise<PipelineListDto> {
    console.log(query);
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;
    const sortBy = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = { companyId };
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

    // Search by developer email if provided
    if (query.search) {
      where.developer = {
        email: {
          contains: query.search,
          mode: 'insensitive',
        },
      };
    }

    const [entries, total] = await Promise.all([
      this.prisma.pipelineEntry.findMany({
        where,
        include: {
          developer: {
            include: {
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

    // Check which developers have unlocked reports for this company
    const developerIds = entries.map((e) => e.developerId);
    const unlockedReports = await this.prisma.unlockedReport.findMany({
      where: {
        companyId,
        developerId: { in: developerIds },
      },
      select: { developerId: true },
    });
    const unlockedSet = new Set(unlockedReports.map((u) => u.developerId));

    const mappedEntries: PipelineEntryDto[] = entries.map((entry) => {
      // Collect all tech stacks from projects
      const techStack = [
        ...new Set(entry.developer.projects.flatMap((p) => p.techStack)),
      ];

      const developer: PipelineDeveloperDto = {
        id: entry.developer.id,
        email: entry.developer.email,
        firstName: entry.developer.firstName || undefined,
        lastName: entry.developer.lastName || undefined,
        assessmentStatus: entry.developer.assessmentStatus,
        overallScore: entry.developer.hiringReport?.overallScore || undefined,
        techStack,
        projectCount: entry.developer.projects.length,
      };

      // Map tags
      const tags: PipelineTagDto[] = entry.tags.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        color: pt.tag.color,
      }));

      return {
        id: entry.id,
        companyId: entry.companyId,
        developerId: entry.developerId,
        stage: entry.stage,
        notes: entry.notes || undefined,
        isUnlocked: unlockedSet.has(entry.developerId),
        developer,
        tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });

    // Include pending invitations (unregistered candidates) when:
    // - No stage filter (showing all), or
    // - Stage filter is INVITED
    // Don't include if filtering by tags (pending invitations don't have tags)
    let allEntries = mappedEntries;
    let adjustedTotal = total;

    const shouldIncludePendingInvitations =
      (!query.stage || query.stage === 'INVITED') && !query.tagIds;

    if (shouldIncludePendingInvitations) {
      const pendingInvitations = await this.getPendingInvitationsForPipeline(
        companyId,
        query.search,
      );

      if (pendingInvitations.length > 0) {
        // If filtering by INVITED, prepend pending invitations
        // Otherwise, prepend to show them at the top of "All" view
        if (query.stage === 'INVITED') {
          allEntries = [...pendingInvitations, ...mappedEntries];
        } else {
          // For "All" view, insert pending invitations before other INVITED entries
          // to keep them grouped together
          allEntries = [...pendingInvitations, ...mappedEntries];
        }
        adjustedTotal = total + pendingInvitations.length;
      }
    }

    return {
      entries: allEntries,
      total: adjustedTotal,
      offset,
      limit,
    };
  }

  /**
   * Get pipeline entries grouped by stage
   */
  async getPipelineGrouped(companyId: number): Promise<PipelineGroupedDto> {
    const entries = await this.prisma.pipelineEntry.findMany({
      where: { companyId },
      include: {
        developer: {
          include: {
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
      orderBy: { updatedAt: 'desc' },
    });

    // Check which developers have unlocked reports for this company
    const developerIds = entries.map((e) => e.developerId);
    const unlockedReports = await this.prisma.unlockedReport.findMany({
      where: {
        companyId,
        developerId: { in: developerIds },
      },
      select: { developerId: true },
    });
    const unlockedSet = new Set(unlockedReports.map((u) => u.developerId));

    const mapEntry = (entry: (typeof entries)[0]): PipelineEntryDto => {
      const techStack = [
        ...new Set(entry.developer.projects.flatMap((p) => p.techStack)),
      ];

      const developer: PipelineDeveloperDto = {
        id: entry.developer.id,
        email: entry.developer.email,
        firstName: entry.developer.firstName || undefined,
        lastName: entry.developer.lastName || undefined,
        assessmentStatus: entry.developer.assessmentStatus,
        overallScore: entry.developer.hiringReport?.overallScore || undefined,
        techStack,
        projectCount: entry.developer.projects.length,
      };

      // Map tags
      const tags: PipelineTagDto[] = entry.tags.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        color: pt.tag.color,
      }));

      return {
        id: entry.id,
        companyId: entry.companyId,
        developerId: entry.developerId,
        stage: entry.stage,
        notes: entry.notes || undefined,
        isUnlocked: unlockedSet.has(entry.developerId),
        developer,
        tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    };

    // Get pending invitations and prepend to invited list
    const pendingInvitations =
      await this.getPendingInvitationsForPipeline(companyId);
    const invitedEntries = entries
      .filter((e) => e.stage === 'INVITED')
      .map(mapEntry);

    return {
      invited: [...pendingInvitations, ...invitedEntries],
      registering: entries
        .filter((e) => e.stage === 'REGISTERING')
        .map(mapEntry),
      projectsSubmitted: entries
        .filter((e) => e.stage === 'PROJECTS_SUBMITTED')
        .map(mapEntry),
      analyzing: entries.filter((e) => e.stage === 'ANALYZING').map(mapEntry),
      pendingAnalysis: entries
        .filter((e) => e.stage === 'PENDING_ANALYSIS')
        .map(mapEntry),
      assessed: entries.filter((e) => e.stage === 'ASSESSED').map(mapEntry),
      unlocked: entries.filter((e) => e.stage === 'UNLOCKED').map(mapEntry),
      hired: entries.filter((e) => e.stage === 'HIRED').map(mapEntry),
      rejected: entries.filter((e) => e.stage === 'REJECTED').map(mapEntry),
    };
  }

  /**
   * Get pipeline statistics (count per stage)
   */
  async getPipelineStats(companyId: number): Promise<PipelineStatsDto> {
    const [counts, pendingInvitationsCount] = await Promise.all([
      this.prisma.pipelineEntry.groupBy({
        by: ['stage'],
        where: { companyId },
        _count: true,
      }),
      // Count pending invitations (unregistered candidates)
      this.prisma.invitation.count({
        where: {
          companyId,
          developerId: null, // No developer attached = unregistered
          status: {
            in: [InvitationStatus.PENDING, InvitationStatus.EXPIRED],
          },
        },
      }),
    ]);

    const statsMap = new Map(counts.map((c) => [c.stage, c._count]));
    const pipelineTotal = counts.reduce((sum, c) => sum + c._count, 0);

    // Include pending invitations in the INVITED count
    const invitedCount =
      (statsMap.get('INVITED') || 0) + pendingInvitationsCount;

    return {
      invited: invitedCount,
      registering: statsMap.get('REGISTERING') || 0,
      projectsSubmitted: statsMap.get('PROJECTS_SUBMITTED') || 0,
      analyzing: statsMap.get('ANALYZING') || 0,
      pendingAnalysis: statsMap.get('PENDING_ANALYSIS') || 0,
      assessed: statsMap.get('ASSESSED') || 0,
      unlocked: statsMap.get('UNLOCKED') || 0,
      hired: statsMap.get('HIRED') || 0,
      rejected: statsMap.get('REJECTED') || 0,
      total: pipelineTotal + pendingInvitationsCount,
    };
  }

  /**
   * Update pipeline stage (only HIRED or REJECTED can be manually set)
   */
  async updateStage(
    companyId: number,
    developerId: number,
    stage: 'HIRED' | 'REJECTED',
  ): Promise<PipelineEntryDto> {
    const entry = await this.prisma.pipelineEntry.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (!entry) {
      throw new NotFoundException('Developer not found in pipeline');
    }

    const updated = await this.prisma.pipelineEntry.update({
      where: { id: entry.id },
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
        companyId_developerId: { companyId, developerId },
      },
    });

    const techStack = [
      ...new Set(updated.developer.projects.flatMap((p) => p.techStack)),
    ];

    // Map tags
    const tags: PipelineTagDto[] = updated.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      color: pt.tag.color,
    }));

    return {
      id: updated.id,
      companyId: updated.companyId,
      developerId: updated.developerId,
      stage: updated.stage,
      notes: updated.notes || undefined,
      isUnlocked: !!unlocked,
      developer: {
        id: updated.developer.id,
        email: updated.developer.email,
        firstName: updated.developer.firstName || undefined,
        lastName: updated.developer.lastName || undefined,
        assessmentStatus: updated.developer.assessmentStatus,
        overallScore: updated.developer.hiringReport?.overallScore || undefined,
        techStack,
        projectCount: updated.developer.projects.length,
      },
      tags,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Update pipeline notes
   */
  async updateNotes(
    companyId: number,
    developerId: number,
    notes: string | null,
  ): Promise<PipelineEntryDto> {
    const entry = await this.prisma.pipelineEntry.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (!entry) {
      throw new NotFoundException('Developer not found in pipeline');
    }

    const updated = await this.prisma.pipelineEntry.update({
      where: { id: entry.id },
      data: { notes },
      include: {
        developer: {
          include: {
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
    });

    // Check if unlocked
    const unlocked = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    const techStack = [
      ...new Set(updated.developer.projects.flatMap((p) => p.techStack)),
    ];

    // Map tags
    const tags: PipelineTagDto[] = updated.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      color: pt.tag.color,
    }));

    return {
      id: updated.id,
      companyId: updated.companyId,
      developerId: updated.developerId,
      stage: updated.stage,
      notes: updated.notes || undefined,
      isUnlocked: !!unlocked,
      developer: {
        id: updated.developer.id,
        email: updated.developer.email,
        firstName: updated.developer.firstName || undefined,
        lastName: updated.developer.lastName || undefined,
        assessmentStatus: updated.developer.assessmentStatus,
        overallScore: updated.developer.hiringReport?.overallScore || undefined,
        techStack,
        projectCount: updated.developer.projects.length,
      },
      tags,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Add developer to pipeline (if not already present)
   */
  async addToPipeline(
    companyId: number,
    developerId: number,
    notes?: string,
  ): Promise<PipelineEntryDto> {
    // Check if developer exists
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        projects: {
          select: { techStack: true },
        },
        hiringReport: {
          select: { overallScore: true },
        },
      },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    // Check if already in pipeline
    const existing = await this.prisma.pipelineEntry.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (existing) {
      throw new ConflictException('Developer already in pipeline');
    }

    // Determine initial stage based on developer's assessment status
    let stage: PipelineStage = 'INVITED';
    switch (developer.assessmentStatus) {
      case 'REGISTERING':
        stage = 'REGISTERING';
        break;
      case 'PROJECTS_SUBMITTED':
        stage = 'PROJECTS_SUBMITTED';
        break;
      case 'ANALYZING':
        stage = 'ANALYZING';
        break;
      case 'PENDING_ANALYSIS':
        stage = 'PENDING_ANALYSIS';
        break;
      case 'ASSESSED':
        stage = 'ASSESSED';
        break;
    }

    // Check if company has unlocked this developer
    const unlocked = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (unlocked) {
      stage = 'UNLOCKED';
    }

    const entry = await this.prisma.pipelineEntry.create({
      data: {
        companyId,
        developerId,
        stage,
        notes,
      },
    });

    const techStack = [
      ...new Set(developer.projects.flatMap((p) => p.techStack)),
    ];

    return {
      id: entry.id,
      companyId: entry.companyId,
      developerId: entry.developerId,
      stage: entry.stage,
      notes: entry.notes || undefined,
      isUnlocked: !!unlocked,
      developer: {
        id: developer.id,
        email: developer.email,
        firstName: developer.firstName || undefined,
        lastName: developer.lastName || undefined,
        assessmentStatus: developer.assessmentStatus,
        overallScore: developer.hiringReport?.overallScore || undefined,
        techStack,
        projectCount: developer.projects.length,
      },
      tags: [], // New entries have no tags
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Remove developer from pipeline
   */
  async removeFromPipeline(
    companyId: number,
    developerId: number,
  ): Promise<void> {
    const entry = await this.prisma.pipelineEntry.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (!entry) {
      throw new NotFoundException('Developer not found in pipeline');
    }

    await this.prisma.pipelineEntry.delete({
      where: { id: entry.id },
    });
  }

  /**
   * Get single pipeline entry
   */
  async getPipelineEntry(
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

    // Check if unlocked
    const unlocked = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    const techStack = [
      ...new Set(entry.developer.projects.flatMap((p) => p.techStack)),
    ];

    // Map tags
    const tags: PipelineTagDto[] = entry.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      color: pt.tag.color,
    }));

    return {
      id: entry.id,
      companyId: entry.companyId,
      developerId: entry.developerId,
      stage: entry.stage,
      notes: entry.notes || undefined,
      isUnlocked: !!unlocked,
      developer: {
        id: entry.developer.id,
        email: entry.developer.email,
        firstName: entry.developer.firstName || undefined,
        lastName: entry.developer.lastName || undefined,
        assessmentStatus: entry.developer.assessmentStatus,
        overallScore: entry.developer.hiringReport?.overallScore || undefined,
        techStack,
        projectCount: entry.developer.projects.length,
      },
      tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
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
    developerId: number,
    tagIds: number[],
  ): Promise<PipelineEntryDto> {
    // Find the pipeline entry
    const entry = await this.prisma.pipelineEntry.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    if (!entry) {
      throw new NotFoundException('Developer not found in pipeline');
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

    // Delete existing tag assignments
    await this.prisma.pipelineEntryTag.deleteMany({
      where: { pipelineEntryId: entry.id },
    });

    // Create new tag assignments
    if (tagIds.length > 0) {
      await this.prisma.pipelineEntryTag.createMany({
        data: tagIds.map((tagId) => ({
          pipelineEntryId: entry.id,
          tagId,
        })),
      });
    }

    // Return updated entry
    return this.getPipelineEntry(
      companyId,
      developerId,
    ) as Promise<PipelineEntryDto>;
  }
}
