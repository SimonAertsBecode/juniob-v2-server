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
import { AuthService } from './auth.service';
import {
  SignupDto,
  SigninDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AcceptInvitationDto,
  VerifyEmailDto,
  VerifyEmailResponseDto,
} from './dto';
import { Public, GetCurrentUserId, GetCurrentUser } from '../common/decorators';
import { RtGuard } from '../common/guards';
import { setAuthCookies, clearAuthCookies } from '../common/utils';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account (developer or company)',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({
    status: 400,
    description: 'Invalid invitation token or validation error',
  })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { refreshToken, accessToken, ...response } =
      await this.authService.signup(dto);

    setAuthCookies(res, accessToken, refreshToken);

    return response;
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to user account' })
  @ApiResponse({
    status: 200,
    description: 'Successfully signed in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signin(
    @Body() dto: SigninDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { refreshToken, accessToken, ...response } =
      await this.authService.signin(dto);

    setAuthCookies(res, accessToken, refreshToken);

    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Log out from user account' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @GetCurrentUserId() userId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);

    clearAuthCookies(res);

    return { message: 'Successfully logged out' };
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async refresh(
    @GetCurrentUserId() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return { message: 'Tokens refreshed successfully' };
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: AuthResponseDto,
  })
  async getMe(@GetCurrentUserId() userId: number): Promise<AuthResponseDto> {
    return this.authService.getMe(userId);
  }

  @Public()
  @Post('accept-invitation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Accept invitation, create account and sign in',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created and signed in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({ status: 409, description: 'Account already exists' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { refreshToken, accessToken, ...response } =
      await this.authService.acceptInvitation(dto);

    setAuthCookies(res, accessToken, refreshToken);

    return response;
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Verify email address with token (and set password for invited users)',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully or password required',
    type: VerifyEmailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  async resendVerification(
    @GetCurrentUserId() userId: number,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(userId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }
}
