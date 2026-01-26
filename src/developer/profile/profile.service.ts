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
  DeveloperTypeEnum,
  TechnicalProfileResponseDto,
  UpdateTechnicalProfileDto,
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
   * Get developer profile with technical profile (developer type + experiences)
   */
  async getProfile(developerId: number): Promise<ProfileResponseDto> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        technicalProfile: {
          include: {
            techExperiences: {
              orderBy: { months: 'desc' },
            },
          },
        },
      },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    // Map technical profile if it exists
    const technicalProfile = developer.technicalProfile
      ? {
          developerType:
            DeveloperTypeEnum[developer.technicalProfile.developerType],
          techExperiences: developer.technicalProfile.techExperiences.map(
            (exp) => ({
              stackName: exp.stackName,
              months: exp.months,
            }),
          ),
        }
      : null;

    return {
      developerId: developer.id,
      email: developer.email,
      firstName: developer.firstName,
      lastName: developer.lastName,
      location: developer.location,
      technicalProfile,
      createdAt: developer.createdAt,
      updatedAt: developer.updatedAt,
    };
  }

  /**
   * Update developer basic profile (personal info only)
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
   * Get technical profile (developer type + experiences)
   */
  async getTechnicalProfile(
    developerId: number,
  ): Promise<TechnicalProfileResponseDto | null> {
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
      include: {
        techExperiences: {
          orderBy: { months: 'desc' },
        },
      },
    });

    if (!technicalProfile) {
      return null;
    }

    return {
      id: technicalProfile.id,
      developerId: technicalProfile.developerId,
      developerType: DeveloperTypeEnum[technicalProfile.developerType],
      techExperiences: technicalProfile.techExperiences.map((exp) => ({
        stackName: exp.stackName,
        months: exp.months,
      })),
      createdAt: technicalProfile.createdAt,
      updatedAt: technicalProfile.updatedAt,
    };
  }

  /**
   * Update or create technical profile (developer type + experiences)
   */
  async updateTechnicalProfile(
    developerId: number,
    dto: UpdateTechnicalProfileDto,
  ): Promise<TechnicalProfileResponseDto> {
    // Validate developer exists
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    // Validate all stack names
    const invalidStacks = dto.experiences.filter(
      (e) => !isValidStack(e.stackName),
    );
    if (invalidStacks.length > 0) {
      throw new BadRequestException(
        `Invalid stack names: ${invalidStacks.map((s) => `"${s.stackName}"`).join(', ')}. Please use stacks from the available stacks list.`,
      );
    }

    // Normalize stack names
    const normalizedExperiences = dto.experiences.map((e) => ({
      stackName: getStackName(e.stackName)!,
      months: e.months,
    }));

    // Use transaction to upsert technical profile and replace experiences
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert technical profile
      const technicalProfile = await tx.technicalProfile.upsert({
        where: { developerId },
        create: {
          developerId,
          developerType: dto.developerType,
        },
        update: {
          developerType: dto.developerType,
        },
      });

      // Delete all existing experiences
      await tx.techExperience.deleteMany({
        where: { technicalProfileId: technicalProfile.id },
      });

      // Create new experiences
      if (normalizedExperiences.length > 0) {
        await tx.techExperience.createMany({
          data: normalizedExperiences.map((e) => ({
            technicalProfileId: technicalProfile.id,
            stackName: e.stackName,
            months: e.months,
          })),
        });
      }

      // Return the updated profile with experiences
      return tx.technicalProfile.findUnique({
        where: { id: technicalProfile.id },
        include: {
          techExperiences: {
            orderBy: { months: 'desc' },
          },
        },
      });
    });

    return {
      id: result!.id,
      developerId: result!.developerId,
      developerType: DeveloperTypeEnum[result!.developerType],
      techExperiences: result!.techExperiences.map((exp) => ({
        stackName: exp.stackName,
        months: exp.months,
      })),
      createdAt: result!.createdAt,
      updatedAt: result!.updatedAt,
    };
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
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
      include: {
        techExperiences: {
          orderBy: { months: 'desc' },
        },
      },
    });

    if (!technicalProfile) {
      return [];
    }

    return technicalProfile.techExperiences.map((exp) => ({
      stackName: exp.stackName,
      months: exp.months,
    }));
  }

  /**
   * Set (add or update) a single tech experience
   * Note: Requires technical profile to exist first
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

    // Get or throw if technical profile doesn't exist
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
    });

    if (!technicalProfile) {
      throw new BadRequestException(
        'Technical profile not found. Please set your developer type first.',
      );
    }

    // Upsert the experience
    await this.prisma.techExperience.upsert({
      where: {
        technicalProfileId_stackName: {
          technicalProfileId: technicalProfile.id,
          stackName: normalizedStackName,
        },
      },
      create: {
        technicalProfileId: technicalProfile.id,
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
   * Note: Requires technical profile to exist first
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

    // Get or throw if technical profile doesn't exist
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
    });

    if (!technicalProfile) {
      throw new BadRequestException(
        'Technical profile not found. Please set your developer type first.',
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
        where: { technicalProfileId: technicalProfile.id },
      });

      // Create new experiences
      if (normalizedExperiences.length > 0) {
        await tx.techExperience.createMany({
          data: normalizedExperiences.map((e) => ({
            technicalProfileId: technicalProfile.id,
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

    // Get technical profile
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
    });

    if (!technicalProfile) {
      throw new NotFoundException('Technical profile not found');
    }

    // Check if experience exists
    const existing = await this.prisma.techExperience.findUnique({
      where: {
        technicalProfileId_stackName: {
          technicalProfileId: technicalProfile.id,
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
        technicalProfileId_stackName: {
          technicalProfileId: technicalProfile.id,
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

    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
    });

    if (!technicalProfile) {
      return null;
    }

    const experience = await this.prisma.techExperience.findUnique({
      where: {
        technicalProfileId_stackName: {
          technicalProfileId: technicalProfile.id,
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
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
      include: {
        techExperiences: true,
      },
    });

    if (!technicalProfile) {
      return {};
    }

    return technicalProfile.techExperiences.reduce(
      (map, exp) => {
        map[exp.stackName] = exp.months;
        return map;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get developer type (used by AI analysis)
   */
  async getDeveloperType(
    developerId: number,
  ): Promise<DeveloperTypeEnum | null> {
    const technicalProfile = await this.prisma.technicalProfile.findUnique({
      where: { developerId },
    });

    if (!technicalProfile) {
      return null;
    }

    return DeveloperTypeEnum[technicalProfile.developerType];
  }

  /**
   * Get visibility status
   * Developers can always toggle visibility - no restrictions
   */
  async getVisibility(developerId: number): Promise<{
    isVisible: boolean;
    canToggle: boolean;
    reason?: string;
  }> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      select: { isVisible: true },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    return {
      isVisible: developer.isVisible,
      canToggle: true,
    };
  }

  /**
   * Toggle developer visibility to companies
   * Developers can always toggle - it's their choice to opt-in or opt-out
   */
  async updateVisibility(
    developerId: number,
    isVisible: boolean,
  ): Promise<{
    isVisible: boolean;
    canToggle: boolean;
    reason?: string;
  }> {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      select: { id: true },
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    await this.prisma.developer.update({
      where: { id: developerId },
      data: { isVisible },
    });

    return {
      isVisible,
      canToggle: true,
    };
  }
}
