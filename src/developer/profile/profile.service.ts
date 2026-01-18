import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProfileResponseDto,
  TechExperienceDto,
  UpdateProfileDto,
  SetExperienceDto,
  StackDto,
  StackSearchResponseDto,
  StacksListResponseDto,
} from './dto';
import {
  STACKS,
  getStacksByCategory,
  isValidStack,
  getStackName,
} from '../../data/stacks';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get developer profile with tech experiences
   */
  async getProfile(developerId: number): Promise<ProfileResponseDto> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        techExperiences: {
          orderBy: { months: 'desc' },
        },
      },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    const techExperiences: TechExperienceDto[] = developer.techExperiences.map(
      (exp) => ({
        stackName: exp.stackName,
        months: exp.months,
      }),
    );

    return {
      developerId: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      location: developer.location,
      techExperiences,
      createdAt: developer.createdAt,
      updatedAt: developer.updatedAt,
    };
  }

  /**
   * Update developer profile (basic info)
   */
  async updateProfile(
    developerId: number,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    await this.prisma.developer.update({
      where: { id: developerId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName : undefined,
        location: dto.location !== undefined ? dto.location : undefined,
      },
    });

    return this.getProfile(developerId);
  }

  /**
   * Get available stacks list
   */
  getAvailableStacks(): StacksListResponseDto {
    const languages: StackDto[] = getStacksByCategory('language');
    const skills: StackDto[] = getStacksByCategory('skill');

    return {
      languages,
      skills,
      total: STACKS.length,
    };
  }

  /**
   * Search stacks by query (max 10 results, alphabetically sorted)
   */
  searchStacks(query?: string): StackSearchResponseDto {
    let matchingStacks: StackDto[] = STACKS;

    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      matchingStacks = STACKS.filter((stack) =>
        stack.name.toLowerCase().includes(searchTerm),
      );
    }

    // Sort alphabetically by name
    const sortedStacks = matchingStacks.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    // Limit to 10 results
    const limitedStacks = sortedStacks.slice(0, 10);

    return {
      stacks: limitedStacks,
      count: limitedStacks.length,
      totalMatches: matchingStacks.length,
    };
  }

  /**
   * Get developer's tech experiences
   */
  async getExperiences(developerId: number): Promise<TechExperienceDto[]> {
    const experiences = await this.prisma.techExperience.findMany({
      where: { developerId },
      orderBy: { months: 'desc' },
    });

    return experiences.map((exp) => ({
      stackName: exp.stackName,
      months: exp.months,
    }));
  }

  /**
   * Set (add or update) a single tech experience
   */
  async setExperience(
    developerId: number,
    dto: SetExperienceDto,
  ): Promise<TechExperienceDto[]> {
    // Validate stack name
    if (!isValidStack(dto.stackName)) {
      throw new BadRequestException(
        `Invalid stack name: "${dto.stackName}". Please use a stack from the available stacks list.`,
      );
    }

    // Get the correct casing for the stack name
    const normalizedStackName = getStackName(dto.stackName)!;

    // Upsert the experience
    await this.prisma.techExperience.upsert({
      where: {
        developerId_stackName: {
          developerId,
          stackName: normalizedStackName,
        },
      },
      create: {
        developerId,
        stackName: normalizedStackName,
        months: dto.months,
      },
      update: {
        months: dto.months,
      },
    });

    return this.getExperiences(developerId);
  }

  /**
   * Set multiple tech experiences at once (replaces all existing)
   */
  async setExperiencesBatch(
    developerId: number,
    experiences: SetExperienceDto[],
  ): Promise<TechExperienceDto[]> {
    // Validate all stack names first
    const invalidStacks = experiences.filter((e) => !isValidStack(e.stackName));
    if (invalidStacks.length > 0) {
      throw new BadRequestException(
        `Invalid stack names: ${invalidStacks.map((s) => `"${s.stackName}"`).join(', ')}. Please use stacks from the available stacks list.`,
      );
    }

    // Normalize stack names
    const normalizedExperiences = experiences.map((e) => ({
      stackName: getStackName(e.stackName)!,
      months: e.months,
    }));

    // Use transaction to delete all and recreate
    await this.prisma.$transaction(async (tx) => {
      // Delete all existing experiences
      await tx.techExperience.deleteMany({
        where: { developerId },
      });

      // Create new experiences
      if (normalizedExperiences.length > 0) {
        await tx.techExperience.createMany({
          data: normalizedExperiences.map((e) => ({
            developerId,
            stackName: e.stackName,
            months: e.months,
          })),
        });
      }
    });

    return this.getExperiences(developerId);
  }

  /**
   * Remove a tech experience
   */
  async removeExperience(
    developerId: number,
    stackName: string,
  ): Promise<TechExperienceDto[]> {
    // Get the correct casing if valid
    const normalizedStackName = getStackName(stackName);

    if (!normalizedStackName) {
      throw new BadRequestException(`Invalid stack name: "${stackName}"`);
    }

    // Check if experience exists
    const existing = await this.prisma.techExperience.findUnique({
      where: {
        developerId_stackName: {
          developerId,
          stackName: normalizedStackName,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `No experience found for stack: "${stackName}"`,
      );
    }

    await this.prisma.techExperience.delete({
      where: {
        developerId_stackName: {
          developerId,
          stackName: normalizedStackName,
        },
      },
    });

    return this.getExperiences(developerId);
  }

  /**
   * Get experience for a specific stack (used by AI analysis)
   */
  async getExperienceForStack(
    developerId: number,
    stackName: string,
  ): Promise<number | null> {
    const normalizedStackName = getStackName(stackName);

    if (!normalizedStackName) {
      return null;
    }

    const experience = await this.prisma.techExperience.findUnique({
      where: {
        developerId_stackName: {
          developerId,
          stackName: normalizedStackName,
        },
      },
    });

    return experience?.months ?? null;
  }

  /**
   * Get all experiences as a map (used by AI analysis)
   */
  async getExperienceMap(developerId: number): Promise<Record<string, number>> {
    const experiences = await this.prisma.techExperience.findMany({
      where: { developerId },
    });

    return experiences.reduce(
      (map, exp) => {
        map[exp.stackName] = exp.months;
        return map;
      },
      {} as Record<string, number>,
    );
  }
}
