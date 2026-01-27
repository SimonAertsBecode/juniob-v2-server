import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GetCurrentUserTableId } from '../../common/decorators';
import { ReportService } from './report.service';
import {
  ReportPreviewDto,
  FullReportDto,
  UnlockReportResponseDto,
  BatchReportsDto,
} from './dto';

@ApiTags('Company - Reports')
@ApiBearerAuth()
@Controller('company/reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('batch')
  @ApiOperation({
    summary: 'Get multiple reports for comparison (2-4 developers)',
  })
  @ApiQuery({
    name: 'developerIds',
    description: 'Comma-separated developer IDs (e.g., 1,2,3)',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch reports (full for unlocked, preview for locked)',
    type: BatchReportsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid developer IDs or less than 2 IDs provided',
  })
  async getBatchReports(
    @GetCurrentUserTableId() companyId: number,
    @Query('developerIds') developerIdsStr: string,
  ): Promise<BatchReportsDto> {
    if (!developerIdsStr) {
      throw new BadRequestException('developerIds query parameter is required');
    }

    const developerIds = developerIdsStr
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (developerIds.length < 2) {
      throw new BadRequestException(
        'At least 2 developer IDs are required for comparison',
      );
    }

    if (developerIds.length > 4) {
      throw new BadRequestException(
        'Maximum 4 developer IDs allowed for comparison',
      );
    }

    return this.reportService.getBatchReports(companyId, developerIds);
  }

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
    @GetCurrentUserTableId() companyId: number,
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
    @GetCurrentUserTableId() companyId: number,
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
    @GetCurrentUserTableId() companyId: number,
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
    @GetCurrentUserTableId() companyId: number,
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
    @GetCurrentUserTableId() companyId: number,
    @Param('developerId', ParseIntPipe) developerId: number,
  ): Promise<{ isUnlocked: boolean }> {
    const isUnlocked = await this.reportService.isReportUnlocked(
      companyId,
      developerId,
    );
    return { isUnlocked };
  }
}
