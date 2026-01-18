import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CollectionDto,
  CollectionWithMembersDto,
  CollectionListDto,
  CollectionMemberDto,
  CollectionMemberDeveloperDto,
} from './dto';

@Injectable()
export class CollectionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all collections for a company
   */
  async getCollections(companyId: number): Promise<CollectionListDto> {
    const collections = await this.prisma.collection.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      collections: collections.map((c) => ({
        id: c.id,
        companyId: c.companyId,
        name: c.name,
        memberCount: c._count.members,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total: collections.length,
    };
  }

  /**
   * Get a single collection with its members
   */
  async getCollection(
    companyId: number,
    collectionId: number,
  ): Promise<CollectionWithMembersDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        members: {
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
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this collection');
    }

    // Get unlocked developers for this company
    const developerIds = collection.members.map((m) => m.developerId);
    const unlockedReports = await this.prisma.unlockedReport.findMany({
      where: {
        companyId,
        developerId: { in: developerIds },
      },
      select: { developerId: true },
    });
    const unlockedSet = new Set(unlockedReports.map((u) => u.developerId));

    const members: CollectionMemberDto[] = collection.members.map((member) => {
      const techStack = [
        ...new Set(member.developer.projects.flatMap((p) => p.techStack)),
      ];

      const developer: CollectionMemberDeveloperDto = {
        id: member.developer.id,
        email: member.developer.email,
        firstName: member.developer.firstName || undefined,
        lastName: member.developer.lastName || undefined,
        assessmentStatus: member.developer.assessmentStatus,
        overallScore: member.developer.hiringReport?.overallScore || undefined,
        techStack,
        isUnlocked: unlockedSet.has(member.developerId),
      };

      return {
        id: member.id,
        developer,
        addedAt: member.addedAt,
      };
    });

    return {
      id: collection.id,
      companyId: collection.companyId,
      name: collection.name,
      memberCount: members.length,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      members,
    };
  }

  /**
   * Create a new collection
   */
  async createCollection(
    companyId: number,
    name: string,
  ): Promise<CollectionDto> {
    // Check for duplicate name
    const existing = await this.prisma.collection.findFirst({
      where: { companyId, name },
    });

    if (existing) {
      throw new ConflictException('A collection with this name already exists');
    }

    const collection = await this.prisma.collection.create({
      data: {
        companyId,
        name,
      },
    });

    return {
      id: collection.id,
      companyId: collection.companyId,
      name: collection.name,
      memberCount: 0,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  /**
   * Update a collection's name
   */
  async updateCollection(
    companyId: number,
    collectionId: number,
    name: string,
  ): Promise<CollectionDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this collection');
    }

    // Check for duplicate name (excluding current collection)
    const existing = await this.prisma.collection.findFirst({
      where: {
        companyId,
        name,
        id: { not: collectionId },
      },
    });

    if (existing) {
      throw new ConflictException('A collection with this name already exists');
    }

    const updated = await this.prisma.collection.update({
      where: { id: collectionId },
      data: { name },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return {
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      memberCount: updated._count.members,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a collection
   */
  async deleteCollection(
    companyId: number,
    collectionId: number,
  ): Promise<void> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this collection');
    }

    await this.prisma.collection.delete({
      where: { id: collectionId },
    });
  }

  /**
   * Add a developer to a collection
   */
  async addDeveloper(
    companyId: number,
    collectionId: number,
    developerId: number,
  ): Promise<CollectionMemberDto> {
    // Verify collection belongs to company
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this collection');
    }

    // Verify developer exists
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

    // Check if already in collection
    const existingMember = await this.prisma.collectionMember.findUnique({
      where: {
        collectionId_developerId: { collectionId, developerId },
      },
    });

    if (existingMember) {
      throw new ConflictException('Developer is already in this collection');
    }

    // Add to collection
    const member = await this.prisma.collectionMember.create({
      data: {
        collectionId,
        developerId,
      },
    });

    // Check if unlocked
    const unlocked = await this.prisma.unlockedReport.findUnique({
      where: {
        companyId_developerId: { companyId, developerId },
      },
    });

    const techStack = [
      ...new Set(developer.projects.flatMap((p) => p.techStack)),
    ];

    return {
      id: member.id,
      developer: {
        id: developer.id,
        email: developer.email,
        firstName: developer.firstName || undefined,
        lastName: developer.lastName || undefined,
        assessmentStatus: developer.assessmentStatus,
        overallScore: developer.hiringReport?.overallScore || undefined,
        techStack,
        isUnlocked: !!unlocked,
      },
      addedAt: member.addedAt,
    };
  }

  /**
   * Remove a developer from a collection
   */
  async removeDeveloper(
    companyId: number,
    collectionId: number,
    developerId: number,
  ): Promise<void> {
    // Verify collection belongs to company
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this collection');
    }

    // Check if member exists
    const member = await this.prisma.collectionMember.findUnique({
      where: {
        collectionId_developerId: { collectionId, developerId },
      },
    });

    if (!member) {
      throw new NotFoundException('Developer is not in this collection');
    }

    await this.prisma.collectionMember.delete({
      where: { id: member.id },
    });
  }

  /**
   * Get all collections a developer is in (for a specific company)
   */
  async getDeveloperCollections(
    companyId: number,
    developerId: number,
  ): Promise<CollectionDto[]> {
    const memberships = await this.prisma.collectionMember.findMany({
      where: {
        developerId,
        collection: { companyId },
      },
      include: {
        collection: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.collection.id,
      companyId: m.collection.companyId,
      name: m.collection.name,
      memberCount: m.collection._count.members,
      createdAt: m.collection.createdAt,
      updatedAt: m.collection.updatedAt,
    }));
  }
}
