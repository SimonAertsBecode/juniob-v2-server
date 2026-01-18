import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
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
import { CollectionService } from './collection.service';
import {
  CollectionDto,
  CollectionWithMembersDto,
  CollectionListDto,
  CollectionMemberDto,
  CreateCollectionDto,
  UpdateCollectionDto,
  AddDeveloperToCollectionDto,
} from './dto';

@ApiTags('Company - Collections')
@ApiBearerAuth()
@Controller('company/collections')
export class CollectionController {
  constructor(private collectionService: CollectionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all collections',
    description: 'Get all collections for the company',
  })
  @ApiResponse({
    status: 200,
    description: 'List of collections',
    type: CollectionListDto,
  })
  async getCollections(
    @GetCurrentUserId() companyId: number,
  ): Promise<CollectionListDto> {
    return this.collectionService.getCollections(companyId);
  }

  @Get(':collectionId')
  @ApiOperation({
    summary: 'Get collection with members',
    description: 'Get a single collection with all its members',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiResponse({
    status: 200,
    description: 'Collection with members',
    type: CollectionWithMembersDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found',
  })
  async getCollection(
    @GetCurrentUserId() companyId: number,
    @Param('collectionId', ParseIntPipe) collectionId: number,
  ): Promise<CollectionWithMembersDto> {
    return this.collectionService.getCollection(companyId, collectionId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create collection',
    description: 'Create a new collection',
  })
  @ApiResponse({
    status: 201,
    description: 'Collection created',
    type: CollectionDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Collection with this name already exists',
  })
  async createCollection(
    @GetCurrentUserId() companyId: number,
    @Body() dto: CreateCollectionDto,
  ): Promise<CollectionDto> {
    return this.collectionService.createCollection(companyId, dto.name);
  }

  @Patch(':collectionId')
  @ApiOperation({
    summary: 'Update collection',
    description: 'Update a collection name',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiResponse({
    status: 200,
    description: 'Collection updated',
    type: CollectionDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Collection with this name already exists',
  })
  async updateCollection(
    @GetCurrentUserId() companyId: number,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Body() dto: UpdateCollectionDto,
  ): Promise<CollectionDto> {
    return this.collectionService.updateCollection(
      companyId,
      collectionId,
      dto.name,
    );
  }

  @Delete(':collectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete collection',
    description: 'Delete a collection (does not delete the developers)',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiResponse({
    status: 204,
    description: 'Collection deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found',
  })
  async deleteCollection(
    @GetCurrentUserId() companyId: number,
    @Param('collectionId', ParseIntPipe) collectionId: number,
  ): Promise<void> {
    return this.collectionService.deleteCollection(companyId, collectionId);
  }

  @Post(':collectionId/members')
  @ApiOperation({
    summary: 'Add developer to collection',
    description: 'Add a developer to a collection',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiResponse({
    status: 201,
    description: 'Developer added to collection',
    type: CollectionMemberDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Collection or developer not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Developer is already in this collection',
  })
  async addDeveloper(
    @GetCurrentUserId() companyId: number,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Body() dto: AddDeveloperToCollectionDto,
  ): Promise<CollectionMemberDto> {
    return this.collectionService.addDeveloper(
      companyId,
      collectionId,
      dto.developerId,
    );
  }

  @Delete(':collectionId/members/:developerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove developer from collection',
    description: 'Remove a developer from a collection',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 204,
    description: 'Developer removed from collection',
  })
  @ApiResponse({
    status: 404,
    description: 'Collection not found or developer not in collection',
  })
  async removeDeveloper(
    @GetCurrentUserId() companyId: number,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<void> {
    return this.collectionService.removeDeveloper(
      companyId,
      collectionId,
      developerId,
    );
  }

  @Get('developer/:developerId')
  @ApiOperation({
    summary: 'Get developer collections',
    description: 'Get all collections a developer belongs to',
  })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Collections containing the developer',
    type: [CollectionDto],
  })
  async getDeveloperCollections(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<CollectionDto[]> {
    return this.collectionService.getDeveloperCollections(
      companyId,
      developerId,
    );
  }
}
