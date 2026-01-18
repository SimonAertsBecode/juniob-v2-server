import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

// Juniob brand color
const ACCENT_COLOR = '#fe5e41';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private frontendUrl: string;
  private emailFrom: string;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });

    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    this.emailFrom =
      this.config.get<string>('EMAIL_FROM') || 'Juniob <noreply@juniob.com>';
  }

  /**
   * Generate base email template
   */
  private getEmailTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${content}
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>Juniob - Junior Developer Pre-Screening Platform</p>
              <p style="margin-top: 5px;">
                <a href="${this.frontendUrl}" style="color: ${ACCENT_COLOR};">juniob.com</a>
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
  private getButton(text: string, url: string): string {
    return `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}"
           style="background-color: ${ACCENT_COLOR}; color: white; padding: 14px 32px;
                  text-decoration: none; border-radius: 6px; display: inline-block;
                  font-weight: bold; font-size: 16px;">
          ${text}
        </a>
      </div>
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Welcome to Juniob!</h1>
      <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
      ${this.getButton('Verify Email', verifyUrl)}
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 13px;">${verifyUrl}</p>
      <p style="margin-top: 30px; color: #888; font-size: 13px;">
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Password Reset Request</h1>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      ${this.getButton('Reset Password', resetUrl)}
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 13px;">${resetUrl}</p>
      <p style="margin-top: 30px; color: #888; font-size: 13px;">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
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
    const signupUrl = `${this.frontendUrl}/signup/developer?invitation=${token}`;

    const messageSection = message
      ? `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${ACCENT_COLOR};">
           <p style="margin: 0; font-style: italic; color: #555;">"${message}"</p>
         </div>`
      : '';

    const content = `
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">You've been invited!</h1>
      <p><strong>${companyName}</strong> has invited you to join Juniob, a platform where you can showcase your technical skills to potential employers.</p>
      ${messageSection}
      <p>Create your profile, submit your GitHub projects, and get AI-powered feedback on your code:</p>
      ${this.getButton('Accept Invitation', signupUrl)}
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 13px;">${signupUrl}</p>
      <p style="margin-top: 30px; color: #888; font-size: 13px;">
        This invitation will expire in 7 days.
      </p>
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Welcome to Juniob, ${name}!</h1>
      <p>Your account is now set up and you're ready to start finding great junior developers.</p>
      <p>Here's what you can do:</p>
      <ul style="color: #555; padding-left: 20px;">
        <li>Invite candidates to create their technical profile</li>
        <li>Track candidates through your hiring pipeline</li>
        <li>Access AI-powered technical assessments</li>
        <li>Organize candidates into collections</li>
      </ul>
      <p>You've received <strong>3 free credits</strong> to unlock developer reports!</p>
      ${this.getButton('Go to Dashboard', dashboardUrl)}
    `;

    const developerContent = `
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Welcome to Juniob, ${name}!</h1>
      <p>Your account is now set up. Complete your profile to showcase your skills to potential employers.</p>
      <p>Here's what to do next:</p>
      <ul style="color: #555; padding-left: 20px;">
        <li>Connect your GitHub account</li>
        <li>Submit 1-3 of your best projects</li>
        <li>Get AI-powered feedback on your code</li>
        <li>Make your profile visible to companies</li>
      </ul>
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Assessment Complete!</h1>
      <p>Hi ${companyName},</p>
      <p>Great news! <strong>${developerName}</strong> (${developerEmail}) has completed their technical assessment on Juniob.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">What's next?</p>
        <p style="margin: 0; color: #555;">You can now unlock their full report to see:</p>
        <ul style="color: #555; margin-top: 10px;">
          <li>Detailed project analyses</li>
          <li>Technical skill breakdown</li>
          <li>Recommended interview questions</li>
          <li>Hiring recommendation</li>
        </ul>
      </div>
      ${this.getButton('View Report', reportUrl)}
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Low Credits Warning</h1>
      <p>Hi ${companyName},</p>
      <p>You have <strong>${creditsRemaining} credit${creditsRemaining === 1 ? '' : 's'}</strong> remaining in your Juniob account.</p>
      <p>Each credit allows you to unlock a developer's full technical assessment report. Top up your credits to continue accessing candidate insights.</p>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;">
          <strong>Tip:</strong> Purchase credit packs for better value - save up to 26% with bulk purchases.
        </p>
      </div>
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">A company viewed your profile!</h1>
      <p>Hi ${developerName},</p>
      <p><strong>${companyName}</strong> has unlocked your technical assessment report on Juniob.</p>
      <p>This means they're interested in your skills and may reach out to you soon. Make sure your contact information is up to date!</p>
      <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
        <p style="margin: 0; color: #155724;">
          <strong>Great job!</strong> Your GitHub projects caught their attention.
        </p>
      </div>
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

    const scoreColor =
      score >= 70 ? '#28a745' : score >= 50 ? '#ffc107' : '#dc3545';

    const content = `
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Project Analysis Complete!</h1>
      <p>Hi ${developerName},</p>
      <p>We've finished analyzing your project <strong>"${projectName}"</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background-color: #f8f9fa; padding: 20px 40px; border-radius: 8px;">
          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Your Score</p>
          <p style="margin: 0; font-size: 48px; font-weight: bold; color: ${scoreColor};">${score}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">out of 100</p>
        </div>
      </div>
      <p>View your detailed feedback including strengths and areas for improvement:</p>
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
      <h1 style="color: ${ACCENT_COLOR}; margin-top: 0;">Assessment Complete!</h1>
      <p>Hi ${developerName},</p>
      <p>All ${projectCount} of your projects have been analyzed. Your profile is now complete and visible to companies on Juniob!</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #666;">Average Score Across Projects</p>
        <p style="margin: 0; font-size: 36px; font-weight: bold; color: ${ACCENT_COLOR};">${averageScore}/100</p>
      </div>
      <p>Companies can now discover your profile and view your technical assessment. Keep your profile updated with your best work!</p>
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
