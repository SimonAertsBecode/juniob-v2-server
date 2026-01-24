import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TagDto, TagListDto, CreateTagDto, UpdateTagDto } from './dto';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all tags for a company
   */
  async getTags(companyId: number): Promise<TagListDto> {
    const tags = await this.prisma.tag.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { pipelineEntries: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mappedTags: TagDto[] = tags.map((tag) => ({
      id: tag.id,
      companyId: tag.companyId,
      name: tag.name,
      color: tag.color,
      usageCount: tag._count.pipelineEntries,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));

    return {
      tags: mappedTags,
      total: mappedTags.length,
    };
  }

  /**
   * Get a single tag by ID
   */
  async getTag(companyId: number, tagId: number): Promise<TagDto> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
      include: {
        _count: {
          select: { pipelineEntries: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return {
      id: tag.id,
      companyId: tag.companyId,
      name: tag.name,
      color: tag.color,
      usageCount: tag._count.pipelineEntries,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  /**
   * Create a new tag
   */
  async createTag(companyId: number, dto: CreateTagDto): Promise<TagDto> {
    // Check if tag with same name already exists for this company
    const existing = await this.prisma.tag.findUnique({
      where: {
        companyId_name: { companyId, name: dto.name },
      },
    });

    if (existing) {
      throw new ConflictException('A tag with this name already exists');
    }

    const tag = await this.prisma.tag.create({
      data: {
        companyId,
        name: dto.name,
        color: dto.color,
      },
    });

    return {
      id: tag.id,
      companyId: tag.companyId,
      name: tag.name,
      color: tag.color,
      usageCount: 0,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    companyId: number,
    tagId: number,
    dto: UpdateTagDto,
  ): Promise<TagDto> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // If changing name, check for conflicts
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: {
          companyId_name: { companyId, name: dto.name },
        },
      });

      if (existing) {
        throw new ConflictException('A tag with this name already exists');
      }
    }

    const updated = await this.prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.color && { color: dto.color }),
      },
      include: {
        _count: {
          select: { pipelineEntries: true },
        },
      },
    });

    return {
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      color: updated.color,
      usageCount: updated._count.pipelineEntries,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a tag
   */
  async deleteTag(companyId: number, tagId: number): Promise<void> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Cascade delete will remove PipelineEntryTag relations
    await this.prisma.tag.delete({
      where: { id: tagId },
    });
  }

  /**
   * Assign a tag to a pipeline entry
   */
  async assignTagToEntry(
    companyId: number,
    pipelineEntryId: number,
    tagId: number,
  ): Promise<void> {
    // Verify tag belongs to company
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify pipeline entry belongs to company
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: pipelineEntryId, companyId },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    // Check if already assigned
    const existing = await this.prisma.pipelineEntryTag.findUnique({
      where: {
        pipelineEntryId_tagId: { pipelineEntryId, tagId },
      },
    });

    if (existing) {
      throw new ConflictException('Tag already assigned to this entry');
    }

    await this.prisma.pipelineEntryTag.create({
      data: {
        pipelineEntryId,
        tagId,
      },
    });
  }

  /**
   * Remove a tag from a pipeline entry
   */
  async removeTagFromEntry(
    companyId: number,
    pipelineEntryId: number,
    tagId: number,
  ): Promise<void> {
    // Verify tag belongs to company
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Verify pipeline entry belongs to company
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: pipelineEntryId, companyId },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    const assignment = await this.prisma.pipelineEntryTag.findUnique({
      where: {
        pipelineEntryId_tagId: { pipelineEntryId, tagId },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Tag not assigned to this entry');
    }

    await this.prisma.pipelineEntryTag.delete({
      where: { id: assignment.id },
    });
  }

  /**
   * Get tags for a specific pipeline entry
   */
  async getEntryTags(
    companyId: number,
    pipelineEntryId: number,
  ): Promise<TagDto[]> {
    // Verify pipeline entry belongs to company
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: pipelineEntryId, companyId },
      include: {
        tags: {
          include: {
            tag: {
              include: {
                _count: {
                  select: { pipelineEntries: true },
                },
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    return entry.tags.map((pt) => ({
      id: pt.tag.id,
      companyId: pt.tag.companyId,
      name: pt.tag.name,
      color: pt.tag.color,
      usageCount: pt.tag._count.pipelineEntries,
      createdAt: pt.tag.createdAt,
      updatedAt: pt.tag.updatedAt,
    }));
  }

  /**
   * Set all tags for a pipeline entry (replace existing)
   */
  async setEntryTags(
    companyId: number,
    pipelineEntryId: number,
    tagIds: number[],
  ): Promise<TagDto[]> {
    // Verify pipeline entry belongs to company
    const entry = await this.prisma.pipelineEntry.findFirst({
      where: { id: pipelineEntryId, companyId },
    });

    if (!entry) {
      throw new NotFoundException('Pipeline entry not found');
    }

    // Verify all tags belong to company
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
      where: { pipelineEntryId },
    });

    // Create new assignments
    if (tagIds.length > 0) {
      await this.prisma.pipelineEntryTag.createMany({
        data: tagIds.map((tagId) => ({
          pipelineEntryId,
          tagId,
        })),
      });
    }

    // Return updated tags
    return this.getEntryTags(companyId, pipelineEntryId);
  }
}
