import {
  Controller,
  Get,
  Post,
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
  ApiParam,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '../../common/decorators';
import { ReportService } from './report.service';
import {
  ReportPreviewDto,
  FullReportDto,
  UnlockReportResponseDto,
} from './dto';

@ApiTags('Company - Reports')
@ApiBearerAuth()
@Controller('company/reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get(':developerId/preview')
  @ApiOperation({ summary: 'Get report preview (no unlock required)' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Report preview with limited info',
    type: ReportPreviewDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Developer assessment not complete',
  })
  async getPreview(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<ReportPreviewDto> {
    return this.reportService.getReportPreview(companyId, developerId);
  }

  @Post(':developerId/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock developer report (costs 1 credit)' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Report unlocked successfully',
    type: UnlockReportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Already unlocked, insufficient credits, or developer not assessed',
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found',
  })
  async unlockReport(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<UnlockReportResponseDto> {
    return this.reportService.unlockReport(companyId, developerId);
  }

  @Get(':developerId/full')
  @ApiOperation({ summary: 'Get full report (requires unlock)' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Full report with all details',
    type: FullReportDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Report not unlocked',
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found',
  })
  async getFullReport(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<FullReportDto> {
    return this.reportService.getFullReport(companyId, developerId);
  }

  @Get(':developerId')
  @ApiOperation({ summary: 'Get report (full if unlocked, preview if not)' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Report data (type indicates if full or preview)',
  })
  @ApiResponse({
    status: 404,
    description: 'Developer not found',
  })
  async getReport(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<{
    type: 'preview' | 'full';
    data: ReportPreviewDto | FullReportDto;
  }> {
    return this.reportService.getReport(companyId, developerId);
  }

  @Get(':developerId/status')
  @ApiOperation({ summary: 'Check if report is unlocked' })
  @ApiParam({ name: 'developerId', description: 'Developer ID' })
  @ApiResponse({
    status: 200,
    description: 'Unlock status',
  })
  async checkUnlockStatus(
    @GetCurrentUserId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<{ isUnlocked: boolean }> {
    const isUnlocked = await this.reportService.isReportUnlocked(
      companyId,
      developerId,
    );
    return { isUnlocked };
  }
}
