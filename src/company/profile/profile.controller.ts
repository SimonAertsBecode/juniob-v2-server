import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  CompanyProfileDto,
  UpdateCompanyProfileDto,
  ChangePasswordDto,
} from './dto';
import { GetCurrentUserTableId } from 'src/common/decorators';

@ApiTags('Company Profile')
@ApiBearerAuth()
@Controller('company/profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get company profile' })
  @ApiResponse({ status: 200, type: CompanyProfileDto })
  async getProfile(
    @GetCurrentUserTableId() companyId: number,
  ): Promise<CompanyProfileDto> {
    return this.profileService.getProfile(companyId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update company profile' })
  @ApiResponse({ status: 200, type: CompanyProfileDto })
  async updateProfile(
    @GetCurrentUserTableId() companyId: number,
    @Body() dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileDto> {
    return this.profileService.updateProfile(companyId, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @GetCurrentUserTableId() companyId: number,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.profileService.changePassword(companyId, dto);
  }
}
