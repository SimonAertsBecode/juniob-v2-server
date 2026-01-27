import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

// Juniob brand colors (matching frontend SCSS variables)
const COLORS = {
  accent: '#fe5e41',
  accentHover: '#e54d32',
  accentDark: '#35000e',
  textPrimary: '#1a1a2e',
  textSecondary: '#4a4a68',
  textMuted: '#8e8ea9',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8f9fb',
  bgTertiary: '#f0f2f5',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.1)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  info: '#3b82f6',
  infoLight: 'rgba(59, 130, 246, 0.1)',
  border: '#e5e7eb',
};

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private frontendUrl: string;
  private emailFrom: string;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: this.config.get<string>('NODE_ENV') !== 'development',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });

    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    this.emailFrom =
      this.config.get<string>('EMAIL_FROM') || 'Juniob <contact@juniob.io>';
  }

  /**
   * Generate the Juniob logo/header section
   */
  private getHeader(): string {
    return `
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid ${COLORS.border};">
        <a href="${this.frontendUrl}" style="text-decoration: none;">
          <span style="font-size: 28px; font-weight: 700; color: ${COLORS.accent}; letter-spacing: -0.5px;">Juniob</span>
        </a>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: ${COLORS.textMuted};">Junior Developer Pre-Screening Platform</p>
      </div>
    `;
  }

  /**
   * Generate base email template
   */
  private getEmailTemplate(content: string, showHeader = true): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Juniob</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${COLORS.textPrimary}; margin: 0; padding: 0; background-color: ${COLORS.bgSecondary};">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: ${COLORS.bgPrimary}; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);">
              ${showHeader ? this.getHeader() : ''}
              ${content}
            </div>
            <div style="text-align: center; margin-top: 30px; color: ${COLORS.textMuted}; font-size: 12px;">
              <p style="margin: 0;">
                <a href="${this.frontendUrl}" style="color: ${COLORS.textMuted}; text-decoration: none;">Juniob</a> -
                Junior Developer Pre-Screening Platform
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="${this.frontendUrl}/privacy" style="color: ${COLORS.textMuted}; text-decoration: underline; margin-right: 15px;">Privacy Policy</a>
                <a href="${this.frontendUrl}/terms" style="color: ${COLORS.textMuted}; text-decoration: underline;">Terms of Service</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate CTA button
   */
  private getButton(
    text: string,
    url: string,
    variant: 'primary' | 'secondary' = 'primary',
  ): string {
    const bgColor = variant === 'primary' ? COLORS.accent : COLORS.bgSecondary;
    const textColor = variant === 'primary' ? '#ffffff' : COLORS.textPrimary;
    const border =
      variant === 'primary' ? 'none' : `1px solid ${COLORS.border}`;

    return `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}"
           style="background-color: ${bgColor}; color: ${textColor}; padding: 14px 32px;
                  text-decoration: none; border-radius: 8px; display: inline-block;
                  font-weight: 600; font-size: 15px; border: ${border};">
          ${text}
        </a>
      </div>
    `;
  }

  /**
   * Generate info box
   */
  private getInfoBox(
    content: string,
    variant: 'info' | 'success' | 'warning' | 'error' = 'info',
  ): string {
    const colors = {
      info: { bg: COLORS.infoLight, border: COLORS.info, text: '#1e40af' },
      success: {
        bg: COLORS.successLight,
        border: COLORS.success,
        text: '#166534',
      },
      warning: {
        bg: COLORS.warningLight,
        border: COLORS.warning,
        text: '#92400e',
      },
      error: { bg: COLORS.errorLight, border: COLORS.error, text: '#991b1b' },
    };

    const { bg, border, text } = colors[variant];

    return `
      <div style="background-color: ${bg}; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${border};">
        <p style="margin: 0; color: ${text}; font-size: 14px;">${content}</p>
      </div>
    `;
  }

  /**
   * Generate feature list
   */
  private getFeatureList(items: string[]): string {
    return `
      <ul style="color: ${COLORS.textSecondary}; padding-left: 20px; margin: 20px 0;">
        ${items.map((item) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
      </ul>
    `;
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    userType: 'company' | 'developer',
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}&type=${userType}`;

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Verify your email address</h1>
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 10px;">Welcome to Juniob! Please verify your email address by clicking the button below:</p>
      ${this.getButton('Verify Email Address', verifyUrl)}
      <p style="color: ${COLORS.textMuted}; font-size: 13px; margin-top: 30px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="word-break: break-all; color: ${COLORS.textMuted}; font-size: 12px; background: ${COLORS.bgTertiary}; padding: 12px; border-radius: 6px;">${verifyUrl}</p>
      <p style="margin-top: 30px; color: ${COLORS.textMuted}; font-size: 13px; border-top: 1px solid ${COLORS.border}; padding-top: 20px;">
        If you didn't create an account with Juniob, you can safely ignore this email.
      </p>
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: 'Verify your Juniob account',
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Reset your password</h1>
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 10px;">We received a request to reset your password. Click the button below to create a new password:</p>
      ${this.getButton('Reset Password', resetUrl)}
      <p style="color: ${COLORS.textMuted}; font-size: 13px; margin-top: 30px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="word-break: break-all; color: ${COLORS.textMuted}; font-size: 12px; background: ${COLORS.bgTertiary}; padding: 12px; border-radius: 6px;">${resetUrl}</p>
      ${this.getInfoBox('<strong>Security notice:</strong> This link will expire in 1 hour.', 'warning')}
      <p style="margin-top: 20px; color: ${COLORS.textMuted}; font-size: 13px;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: 'Reset your Juniob password',
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send candidate invitation email
   */
  async sendInvitationEmail(
    email: string,
    companyName: string,
    token: string,
    message?: string,
  ): Promise<void> {
    const signupUrl = `${this.frontendUrl}/accept-invitation?invitation=${token}`;

    const messageSection = message
      ? `
        <div style="background-color: ${COLORS.bgTertiary}; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${COLORS.accent};">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: ${COLORS.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Message from ${companyName}:</p>
          <p style="margin: 0; font-style: italic; color: ${COLORS.textSecondary}; font-size: 15px;">"${message}"</p>
        </div>
      `
      : '';

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">You've been invited!</h1>
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 10px;">
        <strong style="color: ${COLORS.accent};">${companyName}</strong> has invited you to join Juniob, a platform where you can showcase your technical skills to potential employers.
      </p>
      ${messageSection}
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 10px;">Create your profile and get professional feedback on your code:</p>
      ${this.getFeatureList([
        'Connect your GitHub account',
        'Submit 1-3 of your best projects',
        'Receive detailed code analysis',
        'Get discovered by companies hiring juniors',
      ])}
      ${this.getButton('Accept Invitation', signupUrl)}
      <p style="color: ${COLORS.textMuted}; font-size: 13px; margin-top: 30px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="word-break: break-all; color: ${COLORS.textMuted}; font-size: 12px; background: ${COLORS.bgTertiary}; padding: 12px; border-radius: 6px;">${signupUrl}</p>
      ${this.getInfoBox('This invitation will expire in 7 days.', 'info')}
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: `${companyName} has invited you to Juniob`,
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    isCompany: boolean,
  ): Promise<void> {
    const dashboardUrl = isCompany
      ? `${this.frontendUrl}/company/dashboard`
      : `${this.frontendUrl}/developer/profile`;

    const companyContent = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Welcome to Juniob, ${name}!</h1>
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 20px;">Your account is now set up and you're ready to start finding great junior developers.</p>

      <div style="background: linear-gradient(135deg, ${COLORS.accentDark} 0%, #2a000b 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
        <p style="color: #ffffff; margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">Your starting balance</p>
        <p style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700;">3 Free Credits</p>
        <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 13px; opacity: 0.8;">Use them to unlock developer reports</p>
      </div>

      <p style="color: ${COLORS.textSecondary}; margin-bottom: 10px; font-weight: 600;">Here's what you can do:</p>
      ${this.getFeatureList([
        'Invite candidates to create their technical profile',
        'Track candidates through your hiring pipeline',
        'Access detailed technical assessments',
        'Organize candidates into collections',
      ])}
      ${this.getButton('Go to Dashboard', dashboardUrl)}
    `;

    const developerContent = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Welcome to Juniob, ${name}!</h1>
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 20px;">Your account is now set up. Complete your profile to showcase your skills to potential employers.</p>

      <p style="color: ${COLORS.textSecondary}; margin-bottom: 10px; font-weight: 600;">Here's what to do next:</p>
      ${this.getFeatureList([
        'Complete your profile with your experience',
        'Connect your GitHub account',
        'Submit 1-3 of your best projects',
        'Get professional feedback on your code',
      ])}
      ${this.getInfoBox('<strong>Tip:</strong> Projects with clean code, good documentation, and proper structure score higher.', 'info')}
      ${this.getButton('Complete Your Profile', dashboardUrl)}
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: 'Welcome to Juniob!',
      html: this.getEmailTemplate(
        isCompany ? companyContent : developerContent,
      ),
    });
  }

  /**
   * Send assessment complete notification to company
   */
  async sendAssessmentCompleteEmail(
    companyEmail: string,
    companyName: string,
    developerName: string,
    developerEmail: string,
  ): Promise<void> {
    const reportUrl = `${this.frontendUrl}/company/search?email=${encodeURIComponent(developerEmail)}`;

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Assessment Complete!</h1>
      <p style="color: ${COLORS.textSecondary};">Hi ${companyName},</p>
      <p style="color: ${COLORS.textSecondary};">
        Great news! <strong style="color: ${COLORS.accent};">${developerName}</strong> (${developerEmail}) has completed their technical assessment on Juniob.
      </p>

      <div style="background-color: ${COLORS.bgTertiary}; padding: 24px; border-radius: 12px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${COLORS.textPrimary};">What's included in the report:</p>
        ${this.getFeatureList([
          'Detailed project analyses with code quality scores',
          'Technical skill breakdown',
          'Recommended interview questions',
          'Hiring recommendation',
        ])}
      </div>
      ${this.getButton('View Report', reportUrl)}
      <p style="color: ${COLORS.textMuted}; font-size: 13px; text-align: center;">
        Unlocking a report costs 1 credit
      </p>
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: companyEmail,
      subject: `${developerName} has completed their assessment`,
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send low credits warning to company
   */
  async sendLowCreditsWarningEmail(
    email: string,
    companyName: string,
    creditsRemaining: number,
  ): Promise<void> {
    const creditsUrl = `${this.frontendUrl}/company/credits`;

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Low Credits Warning</h1>
      <p style="color: ${COLORS.textSecondary};">Hi ${companyName},</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, ${COLORS.warning} 0%, #d97706 100%); padding: 24px 40px; border-radius: 12px;">
          <p style="margin: 0; font-size: 48px; font-weight: 700; color: #ffffff;">${creditsRemaining}</p>
          <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">credit${creditsRemaining === 1 ? '' : 's'} remaining</p>
        </div>
      </div>

      <p style="color: ${COLORS.textSecondary};">Each credit allows you to unlock a developer's full technical assessment report. Top up your credits to continue accessing candidate insights.</p>
      ${this.getInfoBox('<strong>Save up to 26%</strong> with bulk credit purchases.', 'info')}
      ${this.getButton('Purchase Credits', creditsUrl)}
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: `Low credits warning - ${creditsRemaining} credit${creditsRemaining === 1 ? '' : 's'} remaining`,
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send report unlocked notification to developer
   */
  async sendReportUnlockedEmail(
    developerEmail: string,
    developerName: string,
    companyName: string,
  ): Promise<void> {
    const profileUrl = `${this.frontendUrl}/developer/profile`;

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">A company viewed your profile!</h1>
      <p style="color: ${COLORS.textSecondary};">Hi ${developerName},</p>
      <p style="color: ${COLORS.textSecondary};">
        <strong style="color: ${COLORS.accent};">${companyName}</strong> has unlocked your technical assessment report on Juniob.
      </p>
      ${this.getInfoBox('<strong>Great job!</strong> Your GitHub projects caught their attention. They may reach out to you soon.', 'success')}
      <p style="color: ${COLORS.textSecondary};">Make sure your contact information is up to date so they can reach you.</p>
      ${this.getButton('View Your Profile', profileUrl)}
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: developerEmail,
      subject: `${companyName} viewed your Juniob profile`,
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send project analysis complete notification to developer
   */
  async sendProjectAnalysisCompleteEmail(
    email: string,
    developerName: string,
    projectName: string,
    score: number,
  ): Promise<void> {
    const profileUrl = `${this.frontendUrl}/developer/assessment`;

    // 5-tier color system matching frontend
    let scoreColor: string;
    let scoreLabel: string;
    if (score >= 80) {
      scoreColor = COLORS.success;
      scoreLabel = 'Excellent';
    } else if (score >= 65) {
      scoreColor = '#10b981';
      scoreLabel = 'Good';
    } else if (score >= 50) {
      scoreColor = COLORS.warning;
      scoreLabel = 'Average';
    } else if (score >= 35) {
      scoreColor = '#f97316';
      scoreLabel = 'Below Average';
    } else {
      scoreColor = COLORS.error;
      scoreLabel = 'Needs Improvement';
    }

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Project Analysis Complete!</h1>
      <p style="color: ${COLORS.textSecondary};">Hi ${developerName},</p>
      <p style="color: ${COLORS.textSecondary};">We've finished analyzing your project <strong>"${projectName}"</strong>.</p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background-color: ${COLORS.bgTertiary}; padding: 30px 50px; border-radius: 16px; border: 2px solid ${scoreColor};">
          <p style="margin: 0 0 8px 0; color: ${COLORS.textMuted}; font-size: 14px;">Your Score</p>
          <p style="margin: 0; font-size: 56px; font-weight: 700; color: ${scoreColor};">${score}</p>
          <p style="margin: 8px 0 0 0; color: ${scoreColor}; font-size: 14px; font-weight: 600;">${scoreLabel}</p>
        </div>
      </div>

      <p style="color: ${COLORS.textSecondary};">View your detailed feedback including strengths and areas for improvement:</p>
      ${this.getButton('View Analysis', profileUrl)}
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: `Analysis complete for "${projectName}" - Score: ${score}/100`,
      html: this.getEmailTemplate(content),
    });
  }

  /**
   * Send all projects analyzed / assessment complete notification to developer
   */
  async sendAllProjectsAnalyzedEmail(
    email: string,
    developerName: string,
    projectCount: number,
    averageScore: number,
  ): Promise<void> {
    const profileUrl = `${this.frontendUrl}/developer/assessment`;

    const content = `
      <h1 style="color: ${COLORS.textPrimary}; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Assessment Complete!</h1>
      <p style="color: ${COLORS.textSecondary};">Hi ${developerName},</p>
      <p style="color: ${COLORS.textSecondary};">
        All <strong>${projectCount}</strong> of your projects have been analyzed. Your profile is now complete and visible to companies on Juniob!
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, ${COLORS.accent} 0%, #ff8066 100%); padding: 30px 50px; border-radius: 16px;">
          <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Average Score</p>
          <p style="margin: 0; font-size: 56px; font-weight: 700; color: #ffffff;">${averageScore}</p>
          <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 13px; opacity: 0.8;">across ${projectCount} project${projectCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      ${this.getInfoBox("<strong>You're now discoverable!</strong> Companies can see your profile and request access to your detailed assessment.", 'success')}
      <p style="color: ${COLORS.textSecondary};">Keep your profile updated with your best work to attract more opportunities.</p>
      ${this.getButton('View Your Assessment', profileUrl)}
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: 'Your Juniob assessment is complete!',
      html: this.getEmailTemplate(content),
    });
  }
}
