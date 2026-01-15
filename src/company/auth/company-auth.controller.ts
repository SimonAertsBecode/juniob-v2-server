import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CompanyAuthService } from './company-auth.service';
import {
  CompanySignupDto,
  CompanySigninDto,
  CompanyAuthResponseDto,
} from './dto';
import {
  Public,
  GetCurrentUserId,
  GetCurrentUser,
} from '../../common/decorators';
import { AtGuard, RtGuard } from '../../common/guards';

@ApiTags('Company Auth')
@Controller('company/auth')
export class CompanyAuthController {
  constructor(private authService: CompanyAuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new company account' })
  @ApiResponse({
    status: 201,
    description: 'Company registered successfully',
    type: CompanyAuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async signup(
    @Body() dto: CompanySignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CompanyAuthResponseDto> {
    const { refreshToken, ...response } = await this.authService.signup(dto);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, refreshToken);

    return response;
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to company account' })
  @ApiResponse({
    status: 200,
    description: 'Successfully signed in',
    type: CompanyAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signin(
    @Body() dto: CompanySigninDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CompanyAuthResponseDto> {
    const { refreshToken, ...response } = await this.authService.signin(dto);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, refreshToken);

    return response;
  }

  @UseGuards(AtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out from company account' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @GetCurrentUserId() companyId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(companyId);

    // Clear the refresh token cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { message: 'Successfully logged out' };
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('jwt')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async refresh(
    @GetCurrentUserId() companyId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.authService.refreshTokens(
      companyId,
      refreshToken,
    );

    // Update refresh token cookie
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @UseGuards(AtGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current company profile' })
  @ApiResponse({
    status: 200,
    description: 'Current company profile',
    type: CompanyAuthResponseDto,
  })
  async getMe(
    @GetCurrentUserId() companyId: number,
  ): Promise<CompanyAuthResponseDto> {
    return this.authService.getMe(companyId);
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
