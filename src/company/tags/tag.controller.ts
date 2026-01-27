import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TagService } from './tag.service';
import { TagDto, TagListDto, CreateTagDto, UpdateTagDto } from './dto';
import { GetCurrentUserTableId } from 'src/common/decorators';

@ApiTags('Company Tags')
@ApiBearerAuth()
@Controller('company/tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tags for the company' })
  @ApiResponse({ status: 200, description: 'List of tags', type: TagListDto })
  async getTags(
    @GetCurrentUserTableId() companyId: number,
  ): Promise<TagListDto> {
    return this.tagService.getTags(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tag by ID' })
  @ApiResponse({ status: 200, description: 'Tag details', type: TagDto })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async getTag(
    @GetCurrentUserTableId() companyId: number,
    @Param('id', ParseIntPipe) tagId: number,
  ): Promise<TagDto> {
    return this.tagService.getTag(companyId, tagId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created', type: TagDto })
  @ApiResponse({
    status: 409,
    description: 'Tag with this name already exists',
  })
  async createTag(
    @GetCurrentUserTableId() companyId: number,
    @Body() dto: CreateTagDto,
  ): Promise<TagDto> {
    return this.tagService.createTag(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({ status: 200, description: 'Tag updated', type: TagDto })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({
    status: 409,
    description: 'Tag with this name already exists',
  })
  async updateTag(
    @GetCurrentUserTableId() companyId: number,
    @Param('id', ParseIntPipe) tagId: number,
    @Body() dto: UpdateTagDto,
  ): Promise<TagDto> {
    return this.tagService.updateTag(companyId, tagId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({ status: 204, description: 'Tag deleted' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async deleteTag(
    @GetCurrentUserTableId() companyId: number,
    @Param('id', ParseIntPipe) tagId: number,
  ): Promise<void> {
    return this.tagService.deleteTag(companyId, tagId);
  }
}
