import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '../common/decorators';
import { GithubAppService } from './github-app.service';
import {
  SetInstallationDto,
  GithubStatusResponseDto,
  GithubInstallationResponseDto,
  GithubRepositoryListResponseDto,
} from './dto';

@ApiTags('Developer - GitHub')
@ApiBearerAuth()
@Controller('developer/github')
export class GithubController {
  constructor(private githubAppService: GithubAppService) {}

  /**
   * Check if developer has connected GitHub App
   */
  @Get('status')
  @ApiOperation({ summary: 'Check GitHub App connection status' })
  @ApiResponse({
    status: 200,
    description: 'GitHub connection status',
    type: GithubStatusResponseDto,
  })
  async getStatus(
    @GetCurrentUserId() developerId: number,
  ): Promise<GithubStatusResponseDto> {
    const isConnected = await this.githubAppService.hasInstallation(developerId);

    if (!isConnected) {
      return { isConnected: false };
    }

    const repositories =
      await this.githubAppService.getAuthorizedRepositories(developerId);

    return {
      isConnected: true,
      repositoryCount: repositories.length,
    };
  }

  /**
   * Set up GitHub App installation
   * Called after developer authorizes the GitHub App in the browser
   */
  @Post('set-installation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set up GitHub App installation' })
  @ApiResponse({
    status: 200,
    description: 'Installation set up successfully',
    type: GithubInstallationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to set up installation',
  })
  async setInstallation(
    @GetCurrentUserId() developerId: number,
    @Body() dto: SetInstallationDto,
  ): Promise<GithubInstallationResponseDto> {
    const result = await this.githubAppService.setInstallation(
      developerId,
      dto.installationId,
      dto.setupAction,
    );

    return result;
  }

  /**
   * Get list of authorized repositories
   */
  @Get('repositories')
  @ApiOperation({ summary: 'Get authorized repositories' })
  @ApiResponse({
    status: 200,
    description: 'List of authorized repositories',
    type: GithubRepositoryListResponseDto,
  })
  async getRepositories(
    @GetCurrentUserId() developerId: number,
  ): Promise<GithubRepositoryListResponseDto> {
    const repositories =
      await this.githubAppService.getAuthorizedRepositories(developerId);

    return {
      repositories,
      count: repositories.length,
    };
  }

  /**
   * Sync repositories from GitHub
   * Refreshes the list of authorized repositories
   */
  @Post('sync-repositories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync repositories from GitHub' })
  @ApiResponse({
    status: 200,
    description: 'Repositories synced successfully',
    type: GithubRepositoryListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'GitHub App not installed',
  })
  async syncRepositories(
    @GetCurrentUserId() developerId: number,
  ): Promise<GithubRepositoryListResponseDto> {
    const repositories =
      await this.githubAppService.syncRepositories(developerId);

    return {
      repositories,
      count: repositories.length,
    };
  }

  /**
   * Disconnect GitHub App
   */
  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect GitHub App' })
  @ApiResponse({
    status: 200,
    description: 'GitHub App disconnected',
  })
  async disconnect(
    @GetCurrentUserId() developerId: number,
  ): Promise<{ success: boolean; message: string }> {
    await this.githubAppService.removeInstallation(developerId);

    return {
      success: true,
      message: 'GitHub App disconnected successfully',
    };
  }
}
