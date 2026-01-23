import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import {
  GithubAppJwtPayload,
  GithubInstallationAccessToken,
  GithubRepository,
  GithubInstallationResult,
  GithubRepositoryInfo,
} from './types';
import { Octokit } from '@octokit/core';

@Injectable()
export class GithubAppService {
  private readonly logger = new Logger(GithubAppService.name);
  private readonly appId: string;
  private readonly privateKey: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    this.appId = this.config.getOrThrow<string>('GITHUB_APP_ID');
    this.privateKey = this.config.getOrThrow<string>('GITHUB_APP_PRIVATE_KEY');
  }

  /**
   * Set up a GitHub App installation for a developer
   * Called after developer authorizes the GitHub App
   */
  async setInstallation(
    developerId: number,
    installationId: string,
    setupAction: 'install' | 'update',
  ): Promise<GithubInstallationResult> {
    this.logger.log(
      `Setting up GitHub App installation ${installationId} for developer ${developerId} (action: ${setupAction})`,
    );

    try {
      // Get installation access token from GitHub
      const tokenData = await this.getInstallationAccessToken(installationId);

      // Encrypt the token before storage
      const encryptedToken = this.encryptionService.encrypt(tokenData.token);

      // Check if installation already exists
      const existingInstallation =
        await this.prisma.githubAppInstallation.findFirst({
          where: { developerId, installationId },
        });

      let installation;

      if (existingInstallation) {
        // Update existing installation
        installation = await this.prisma.githubAppInstallation.update({
          where: { id: existingInstallation.id },
          data: {
            accessTokenEncrypted: encryptedToken,
            tokenExpiresAt: new Date(tokenData.expires_at),
          },
        });

        // Delete old repositories to refresh the list
        await this.prisma.githubAppRepository.deleteMany({
          where: { installationId: installation.id },
        });
      } else {
        // Create new installation
        installation = await this.prisma.githubAppInstallation.create({
          data: {
            developerId,
            installationId,
            accessTokenEncrypted: encryptedToken,
            tokenExpiresAt: new Date(tokenData.expires_at),
          },
        });
      }

      // Fetch and store authorized repositories
      const repositories = await this.fetchInstallationRepositories(
        tokenData.token,
      );

      if (repositories.length > 0) {
        await this.prisma.githubAppRepository.createMany({
          data: repositories.map((repo) => ({
            installationId: installation.id,
            githubRepoId: BigInt(repo.id),
            repoName: repo.name,
            repoFullName: repo.full_name,
            description: repo.description,
            isPrivate: repo.private,
          })),
          skipDuplicates: true,
        });
      }

      this.logger.log(
        `Successfully set up installation with ${repositories.length} repositories`,
      );

      return {
        success: true,
        message:
          setupAction === 'install'
            ? `GitHub App installed successfully with ${repositories.length} repositories`
            : `GitHub App updated successfully with ${repositories.length} repositories`,
        repositoryCount: repositories.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to set up GitHub App installation: ${error}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to set up GitHub App installation. Please try again.',
      );
    }
  }

  /**
   * Get list of authorized repositories for a developer
   */
  async getAuthorizedRepositories(
    developerId: number,
  ): Promise<GithubRepositoryInfo[]> {
    const installation = await this.prisma.githubAppInstallation.findFirst({
      where: { developerId },
      include: { repositories: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!installation) {
      return [];
    }

    return installation.repositories.map(
      (repo): GithubRepositoryInfo => ({
        id: Number(repo.githubRepoId),
        name: repo.repoName,
        fullName: repo.repoFullName,
        url: `https://github.com/${repo.repoFullName}`,
        isPrivate: repo.isPrivate,
        description: repo.description,
      }),
    );
  }

  /**
   * Check if a repository is authorized for a developer
   */
  async isRepositoryAuthorized(
    developerId: number,
    repoFullName: string,
  ): Promise<boolean> {
    const repository = await this.prisma.githubAppRepository.findFirst({
      where: {
        repoFullName,
        installation: { developerId },
      },
    });

    return repository !== null;
  }

  /**
   * Get an authenticated Octokit instance for a developer
   * Automatically refreshes the token if expired
   */
  async getAuthenticatedOctokit(developerId: number): Promise<Octokit | null> {
    const installation = await this.prisma.githubAppInstallation.findFirst({
      where: { developerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!installation || !installation.accessTokenEncrypted) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresAt = installation.tokenExpiresAt;
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt && now.getTime() >= expiresAt.getTime() - bufferMs) {
      // Token expired or about to expire, refresh it
      this.logger.log(`Refreshing expired token for developer ${developerId}`);

      try {
        const tokenData = await this.getInstallationAccessToken(
          installation.installationId,
        );

        const encryptedToken = this.encryptionService.encrypt(tokenData.token);

        await this.prisma.githubAppInstallation.update({
          where: { id: installation.id },
          data: {
            accessTokenEncrypted: encryptedToken,
            tokenExpiresAt: new Date(tokenData.expires_at),
          },
        });

        return new Octokit({ auth: tokenData.token });
      } catch (error: any) {
        this.logger.error(`Failed to refresh token: ${error}`);
        return null;
      }
    }

    // Token is still valid, decrypt and use
    const token = this.encryptionService.decrypt(
      installation.accessTokenEncrypted,
    );

    return new Octokit({ auth: token });
  }

  /**
   * Check if developer has a GitHub App installation
   */
  async hasInstallation(developerId: number): Promise<boolean> {
    const count = await this.prisma.githubAppInstallation.count({
      where: { developerId },
    });

    return count > 0;
  }

  /**
   * Get the installation ID for a developer
   */
  async getInstallationId(developerId: number): Promise<string | null> {
    const installation = await this.prisma.githubAppInstallation.findFirst({
      where: { developerId },
      orderBy: { createdAt: 'desc' },
      select: { installationId: true },
    });

    return installation?.installationId || null;
  }

  /**
   * Remove GitHub App installation for a developer
   * Also removes projects with PENDING or FAILED status
   */
  async removeInstallation(developerId: number): Promise<void> {
    // Find and delete projects with PENDING or FAILED status
    const projectsToDelete = await this.prisma.technicalProject.findMany({
      where: {
        developerId,
        OR: [
          { analysis: null },
          { analysis: { status: { in: ['PENDING', 'FAILED'] } } },
        ],
      },
      select: { id: true, name: true },
    });

    if (projectsToDelete.length > 0) {
      await this.prisma.technicalProject.deleteMany({
        where: { id: { in: projectsToDelete.map((p) => p.id) } },
      });

      this.logger.log(
        `Deleted ${projectsToDelete.length} pending/failed projects for developer ${developerId}: ${projectsToDelete.map((p) => p.name).join(', ')}`,
      );
    }

    // Remove the GitHub installation
    await this.prisma.githubAppInstallation.deleteMany({
      where: { developerId },
    });

    this.logger.log(
      `Removed GitHub App installation for developer ${developerId}`,
    );
  }

  /**
   * Sync repositories - refresh the list from GitHub
   * Also cleans up projects that no longer have access to their repos
   */
  async syncRepositories(developerId: number): Promise<GithubRepositoryInfo[]> {
    const octokit = await this.getAuthenticatedOctokit(developerId);

    if (!octokit) {
      throw new UnauthorizedException(
        'GitHub App not installed. Please install the GitHub App first.',
      );
    }

    const installation = await this.prisma.githubAppInstallation.findFirst({
      where: { developerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!installation || !installation.accessTokenEncrypted) {
      throw new UnauthorizedException('GitHub App not installed');
    }

    // Get current token
    const token = this.encryptionService.decrypt(
      installation.accessTokenEncrypted,
    );

    // Fetch fresh repository list
    const repositories = await this.fetchInstallationRepositories(token);

    // Delete old and insert new
    await this.prisma.githubAppRepository.deleteMany({
      where: { installationId: installation.id },
    });

    if (repositories.length > 0) {
      await this.prisma.githubAppRepository.createMany({
        data: repositories.map((repo) => ({
          installationId: installation.id,
          githubRepoId: BigInt(repo.id),
          repoName: repo.name,
          repoFullName: repo.full_name,
          description: repo.description,
          isPrivate: repo.private,
        })),
        skipDuplicates: true,
      });
    }

    // Clean up projects that no longer have repo access (only PENDING or FAILED)
    await this.cleanupOrphanedProjects(developerId, repositories);

    this.logger.log(
      `Synced ${repositories.length} repositories for developer ${developerId}`,
    );

    return repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: `https://github.com/${repo.full_name}`,
      isPrivate: repo.private,
      description: repo.description,
    }));
  }

  /**
   * Clean up projects whose repos are no longer authorized
   * Only removes projects with PENDING or FAILED status
   * Projects with ANALYZING or COMPLETE status are preserved
   */
  private async cleanupOrphanedProjects(
    developerId: number,
    authorizedRepos: GithubRepository[],
  ): Promise<void> {
    // Get all repo full names that are now authorized
    const authorizedRepoNames = new Set(
      authorizedRepos.map((repo) => repo.full_name.toLowerCase()),
    );

    // Find all developer's projects
    const projects = await this.prisma.technicalProject.findMany({
      where: { developerId },
      include: { analysis: true },
    });

    // Find projects that need to be removed
    const projectsToDelete: number[] = [];

    for (const project of projects) {
      // Extract repo full name from GitHub URL
      const match = project.githubUrl.match(/github\.com\/(.+)$/);
      const repoFullName = match ? match[1].toLowerCase() : null;

      // If repo is no longer authorized
      if (repoFullName && !authorizedRepoNames.has(repoFullName)) {
        const analysisStatus = project.analysis?.status;

        // Only delete if status is PENDING or FAILED
        if (!analysisStatus || analysisStatus === 'PENDING' || analysisStatus === 'FAILED') {
          projectsToDelete.push(project.id);
          this.logger.log(
            `Removing project ${project.id} (${project.name}) - repo access revoked and status is ${analysisStatus || 'no analysis'}`,
          );
        } else {
          this.logger.log(
            `Keeping project ${project.id} (${project.name}) - repo access revoked but status is ${analysisStatus}`,
          );
        }
      }
    }

    // Delete the identified projects (cascade will delete analyses too)
    if (projectsToDelete.length > 0) {
      await this.prisma.technicalProject.deleteMany({
        where: { id: { in: projectsToDelete } },
      });

      this.logger.log(
        `Cleaned up ${projectsToDelete.length} projects for developer ${developerId}`,
      );
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  /**
   * Generate a JWT for GitHub App authentication
   */
  private generateAppJwt(): string {
    if (!this.appId || !this.privateKey) {
      throw new Error(
        'GitHub App credentials not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.',
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: GithubAppJwtPayload = {
      iat: now - 60, // Issued 60 seconds in the past to account for clock drift
      exp: now + 10 * 60, // Expires in 10 minutes
      iss: this.appId,
    };

    // Handle different private key formats
    let privateKey = this.privateKey;

    // If the key is base64 encoded, decode it
    if (!privateKey.includes('BEGIN')) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
      } catch {
        throw new Error(
          'Invalid GITHUB_APP_PRIVATE_KEY format. Must be PEM format or base64 encoded PEM.',
        );
      }
    }

    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Validate the key format
    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      throw new Error(
        'GITHUB_APP_PRIVATE_KEY must be a valid PEM formatted RSA private key.',
      );
    }

    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
    });
  }

  /**
   * Exchange installation ID for an access token
   */
  private async getInstallationAccessToken(
    installationId: string,
  ): Promise<GithubInstallationAccessToken> {
    const appJwt = this.generateAppJwt();

    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to get installation access token: ${error}`);
      throw new BadRequestException(
        'Failed to authenticate with GitHub. Please reinstall the GitHub App.',
      );
    }

    const data = (await response.json()) as GithubInstallationAccessToken;
    return data;
  }

  /**
   * Fetch all repositories accessible to the installation
   */
  private async fetchInstallationRepositories(
    token: string,
  ): Promise<GithubRepository[]> {
    const octokit = new Octokit({ auth: token });
    let repositories: GithubRepository[] = [];

    try {
      // Paginate through all repositories
      const repositoriesResponse = await octokit.request(
        'GET /installation/repositories',
        {
          per_page: 100,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      repositories = repositoriesResponse.data.repositories.map(
        (repo) =>
          ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || null,
            private: repo.private,
            default_branch: repo.default_branch,
            html_url: repo.html_url,
          }) as GithubRepository,
      );
    } catch (error: any) {
      this.logger.error(`Failed to fetch installation repositories: ${error}`);
      // Return empty array instead of throwing - installation might have no repos yet
    }
    console.log(repositories);
    return repositories;
  }
}
