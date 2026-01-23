import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GithubStatusResponseDto {
  @ApiProperty({
    description: 'Whether the developer has connected GitHub App',
    example: true,
  })
  isConnected: boolean;

  @ApiPropertyOptional({
    description: 'Number of authorized repositories',
    example: 5,
  })
  repositoryCount?: number;

  @ApiPropertyOptional({
    description: 'GitHub App installation ID (for configuring repository access)',
    example: '12345678',
  })
  installationId?: string;
}

export class GithubInstallationResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'GitHub App installed successfully with 5 repositories',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Number of repositories synced',
    example: 5,
  })
  repositoryCount?: number;
}

export class GithubRepositoryResponseDto {
  @ApiProperty({
    description: 'GitHub repository ID',
    example: 123456789,
  })
  id: number;

  @ApiProperty({
    description: 'Repository name',
    example: 'my-project',
  })
  name: string;

  @ApiProperty({
    description: 'Full repository name (owner/repo)',
    example: 'username/my-project',
  })
  fullName: string;

  @ApiProperty({
    description: 'Repository URL',
    example: 'https://github.com/username/my-project',
  })
  url: string;

  @ApiProperty({
    description: 'Whether the repository is private',
    example: false,
  })
  isPrivate: boolean;

  @ApiPropertyOptional({
    description: 'Repository description',
    example: 'My awesome project',
    nullable: true,
  })
  description: string | null;
}

export class GithubRepositoryListResponseDto {
  @ApiProperty({
    description: 'List of authorized repositories',
    type: [GithubRepositoryResponseDto],
  })
  repositories: GithubRepositoryResponseDto[];

  @ApiProperty({
    description: 'Total count of repositories',
    example: 5,
  })
  count: number;
}
