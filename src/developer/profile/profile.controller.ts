import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '../../common/decorators';
import { ProfileService } from './profile.service';
import {
  ProfileResponseDto,
  UpdateProfileDto,
  TechExperienceDto,
  SetExperienceDto,
  SetExperienceBatchDto,
  StacksListResponseDto,
  SearchStacksQueryDto,
  StackSearchResponseDto,
} from './dto';

@ApiTags('Developer - Profile')
@ApiBearerAuth()
@Controller('developer/profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get developer profile with tech experiences' })
  @ApiResponse({
    status: 200,
    description: 'Developer profile',
    type: ProfileResponseDto,
  })
  async getProfile(
    @GetCurrentUserId() developerId: number,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(developerId);
  }

  @Put()
  @ApiOperation({ summary: 'Update developer profile' })
  @ApiResponse({
    status: 200,
    description: 'Updated profile',
    type: ProfileResponseDto,
  })
  async updateProfile(
    @GetCurrentUserId() developerId: number,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(developerId, dto);
  }

  @Get('stacks')
  @ApiOperation({ summary: 'Get list of available technology stacks' })
  @ApiResponse({
    status: 200,
    description: 'Available stacks',
    type: StacksListResponseDto,
  })
  getAvailableStacks(): StacksListResponseDto {
    return this.profileService.getAvailableStacks();
  }

  @Get('stacks/search')
  @ApiOperation({
    summary: 'Search technology stacks',
    description:
      'Search for stacks by name. Returns max 10 results sorted alphabetically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching stacks',
    type: StackSearchResponseDto,
  })
  searchStacks(@Query() query: SearchStacksQueryDto): StackSearchResponseDto {
    return this.profileService.searchStacks(query.q);
  }

  @Get('experiences')
  @ApiOperation({ summary: 'Get developer tech experiences' })
  @ApiResponse({
    status: 200,
    description: 'List of tech experiences',
    type: [TechExperienceDto],
  })
  async getExperiences(
    @GetCurrentUserId() developerId: number,
  ): Promise<TechExperienceDto[]> {
    return this.profileService.getExperiences(developerId);
  }

  @Post('experiences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or update a tech experience' })
  @ApiResponse({
    status: 200,
    description: 'Updated list of experiences',
    type: [TechExperienceDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid stack name',
  })
  async setExperience(
    @GetCurrentUserId() developerId: number,
    @Body() dto: SetExperienceDto,
  ): Promise<TechExperienceDto[]> {
    return this.profileService.setExperience(developerId, dto);
  }

  @Put('experiences')
  @ApiOperation({ summary: 'Set all tech experiences (replaces existing)' })
  @ApiResponse({
    status: 200,
    description: 'Updated list of experiences',
    type: [TechExperienceDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid stack names',
  })
  async setExperiencesBatch(
    @GetCurrentUserId() developerId: number,
    @Body() dto: SetExperienceBatchDto,
  ): Promise<TechExperienceDto[]> {
    return this.profileService.setExperiencesBatch(
      developerId,
      dto.experiences,
    );
  }

  @Delete('experiences/:stackName')
  @ApiOperation({ summary: 'Remove a tech experience' })
  @ApiParam({
    name: 'stackName',
    description: 'Stack name to remove',
    example: 'React.js',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated list of experiences',
    type: [TechExperienceDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Experience not found',
  })
  async removeExperience(
    @GetCurrentUserId() developerId: number,
    @Param('stackName') stackName: string,
  ): Promise<TechExperienceDto[]> {
    return this.profileService.removeExperience(developerId, stackName);
  }
}
