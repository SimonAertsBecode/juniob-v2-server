import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import {
  CreateInvitationDto,
  InvitationResponseDto,
  InvitationListDto,
  InvitationStatusDto,
  DeveloperStatusDto,
} from './dto';
import { GetCurrentUserTableId } from '../../common/decorators';
import { AtGuard } from '../../common/guards';

@ApiTags('Company Invitations')
@Controller('company/invitations')
@UseGuards(AtGuard)
@ApiBearerAuth('access-token')
export class InvitationController {
  constructor(private invitationService: InvitationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create invitation or track candidate' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Invitation already exists' })
  async createInvitation(
    @GetCurrentUserTableId() companyId: number,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    return this.invitationService.createInvitation(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invitations for company' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: InvitationStatusDto,
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
    type: InvitationListDto,
  })
  async getInvitations(
    @GetCurrentUserTableId() companyId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: InvitationStatusDto,
  ): Promise<InvitationListDto> {
    return this.invitationService.getCompanyInvitations(
      companyId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
      status,
    );
  }

  @Get('status/:email')
  @ApiOperation({ summary: 'Get developer status by email' })
  @ApiParam({
    name: 'email',
    description: 'Developer email address',
    example: 'developer@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Developer status',
    type: DeveloperStatusDto,
  })
  async getDeveloperStatus(
    @GetCurrentUserTableId() companyId: number,
    @Param('email') email: string,
  ): Promise<DeveloperStatusDto> {
    return this.invitationService.getDeveloperStatus(companyId, email);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invitation email' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent',
    type: InvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot resend accepted invitation',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async resendInvitation(
    @GetCurrentUserTableId() companyId: number,
    @Param('id', ParseIntPipe) invitationId: number,
  ): Promise<InvitationResponseDto> {
    return this.invitationService.resendInvitation(companyId, invitationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 204, description: 'Invitation deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete accepted invitation',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async deleteInvitation(
    @GetCurrentUserTableId() companyId: number,
    @Param('id', ParseIntPipe) invitationId: number,
  ): Promise<void> {
    return this.invitationService.deleteInvitation(companyId, invitationId);
  }
}
