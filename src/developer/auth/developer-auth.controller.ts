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
import { DeveloperAuthService } from './developer-auth.service';
import {
  DeveloperSignupDto,
  DeveloperSigninDto,
  DeveloperAuthResponseDto,
} from './dto';
import {
  Public,
  GetCurrentUserId,
  GetCurrentUser,
} from '../../common/decorators';
import { AtGuard, RtGuard } from '../../common/guards';

@ApiTags('Developer Auth')
@Controller('developer/auth')
export class DeveloperAuthController {
  constructor(private authService: DeveloperAuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new developer account' })
  @ApiResponse({
    status: 201,
    description: 'Developer registered successfully',
    type: DeveloperAuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid invitation token' })
  async signup(
    @Body() dto: DeveloperSignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeveloperAuthResponseDto> {
    const { refreshToken, ...response } = await this.authService.signup(dto);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, refreshToken);

    return response;
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to developer account' })
  @ApiResponse({
    status: 200,
    description: 'Successfully signed in',
    type: DeveloperAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signin(
    @Body() dto: DeveloperSigninDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DeveloperAuthResponseDto> {
    const { refreshToken, ...response } = await this.authService.signin(dto);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, refreshToken);

    return response;
  }

  @UseGuards(AtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out from developer account' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @GetCurrentUserId() developerId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(developerId);

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
    @GetCurrentUserId() developerId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.authService.refreshTokens(
      developerId,
      refreshToken,
    );

    // Update refresh token cookie
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  @UseGuards(AtGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current developer profile' })
  @ApiResponse({
    status: 200,
    description: 'Current developer profile',
    type: DeveloperAuthResponseDto,
  })
  async getMe(
    @GetCurrentUserId() developerId: number,
  ): Promise<DeveloperAuthResponseDto> {
    return this.authService.getMe(developerId);
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
