import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Developer info for collection member
 */
export class CollectionMemberDeveloperDto {
  @ApiProperty({ description: 'Developer ID' })
  id: number;

  @ApiProperty({ description: 'Developer email' })
  email: string;

  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiProperty({ description: 'Assessment status' })
  assessmentStatus: string;

  @ApiPropertyOptional({ description: 'Overall score (if assessed)' })
  overallScore?: number;

  @ApiProperty({ description: 'Tech stack from projects', type: [String] })
  techStack: string[];

  @ApiProperty({ description: 'Whether report is unlocked by this company' })
  isUnlocked: boolean;
}

/**
 * Collection member (developer in a collection)
 */
export class CollectionMemberDto {
  @ApiProperty({ description: 'Member entry ID' })
  id: number;

  @ApiProperty({ description: 'Developer info' })
  developer: CollectionMemberDeveloperDto;

  @ApiProperty({ description: 'When developer was added to collection' })
  addedAt: Date;
}

/**
 * Collection response
 */
export class CollectionDto {
  @ApiProperty({ description: 'Collection ID' })
  id: number;

  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Collection name' })
  name: string;

  @ApiProperty({ description: 'Number of developers in collection' })
  memberCount: number;

  @ApiProperty({ description: 'Collection created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Collection last updated at' })
  updatedAt: Date;
}

/**
 * Collection with members
 */
export class CollectionWithMembersDto extends CollectionDto {
  @ApiProperty({ description: 'Collection members', type: [CollectionMemberDto] })
  members: CollectionMemberDto[];
}
