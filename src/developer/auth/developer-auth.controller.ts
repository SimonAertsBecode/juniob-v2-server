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
  ApiCookieAuth,
} from '@nestjs/swagger';
import { DeveloperAuthService } from './developer-auth.service';
import {
  DeveloperSignupDto,
  DeveloperSigninDto,
  DeveloperAuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import {
  Public,
  GetCurrentUserId,
  GetCurrentUser,
} from '../../common/decorators';
import { RtGuard } from '../../common/guards';

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
    const { refreshToken, accessToken, ...response } =
      await this.authService.signup(dto);

    // Set tokens as HTTP-only cookies
    this.setTokenCookies(res, accessToken, refreshToken);

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
    const { refreshToken, accessToken, ...response } =
      await this.authService.signin(dto);

    // Set tokens as HTTP-only cookies
    this.setTokenCookies(res, accessToken, refreshToken);

    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Log out from developer account' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @GetCurrentUserId() developerId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(developerId);

    // Clear both token cookies
    this.clearTokenCookies(res);

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
  ): Promise<{ message: string }> {
    const tokens = await this.authService.refreshTokens(
      developerId,
      refreshToken,
    );

    // Update both token cookies
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return { message: 'Tokens refreshed successfully' };
  }

  @Get('me')
  @ApiCookieAuth('access_token')
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

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body('token') token: string,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  async resendVerification(
    @GetCurrentUserId() developerId: number,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(developerId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Access token cookie (15 minutes)
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Refresh token cookie (7 days)
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearTokenCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('jwt', cookieOptions);
  }
}
