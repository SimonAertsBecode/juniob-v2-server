import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

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

  async sendVerificationEmail(
    email: string,
    token: string,
    userType: 'company' | 'developer',
  ): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}&type=${userType}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify your email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Welcome to Juniob!</h1>
            <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you didn't create an account with Juniob, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Juniob - Junior Developer Pre-Screening Platform
            </p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: 'Verify your Juniob account',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset your password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Password Reset Request</h1>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Juniob - Junior Developer Pre-Screening Platform
            </p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: 'Reset your Juniob password',
      html,
    });
  }

  async sendInvitationEmail(
    email: string,
    companyName: string,
    token: string,
    message?: string,
  ): Promise<void> {
    const signupUrl = `${this.frontendUrl}/signup/developer?invitation=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>You've been invited to Juniob</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">You've been invited!</h1>
            <p><strong>${companyName}</strong> has invited you to join Juniob, a platform where you can showcase your technical skills to potential employers.</p>
            ${message ? `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="margin: 0; font-style: italic;">"${message}"</p></div>` : ''}
            <p>Create your profile, submit your GitHub projects, and get AI-powered feedback on your code:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${signupUrl}</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              This invitation will expire in 7 days.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Juniob - Junior Developer Pre-Screening Platform
            </p>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: email,
      subject: `${companyName} has invited you to Juniob`,
      html,
    });
  }
}
