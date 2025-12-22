import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
      this.logger.log('Email transporter configured successfully');
    } else {
      this.logger.warn('SMTP not configured - emails will be logged to console');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const from = this.configService.get<string>('EMAIL_FROM') || 'noreply@annix.com';

    if (!this.isConfigured) {
      this.logger.log('=== EMAIL (Console Mode) ===');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`From: ${from}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body: ${options.text || options.html}`);
      this.logger.log('=== END EMAIL ===');
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendSupplierVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/supplier/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - Annix Supplier Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to Annix Supplier Portal</h1>
          <p>Thank you for registering as a supplier. Please verify your email address to continue with the onboarding process.</p>
          <p style="margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not register for an Annix Supplier account, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Annix Supplier Portal

      Thank you for registering as a supplier. Please verify your email address to continue with the onboarding process.

      Click here to verify: ${verificationLink}

      This link will expire in 24 hours.

      If you did not register for an Annix Supplier account, please ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Annix Supplier Portal',
      html,
      text,
    });
  }

  async sendSupplierApprovalEmail(email: string, companyName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const portalLink = `${frontendUrl}/supplier/portal/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Onboarding Approved - Annix Supplier Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #16a34a;">Congratulations!</h1>
          <p>Your supplier onboarding for <strong>${companyName}</strong> has been approved.</p>
          <p>You can now access all supplier portal features, including:</p>
          <ul>
            <li>View and respond to RFQs</li>
            <li>Submit quotations</li>
            <li>Manage your company profile</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${portalLink}"
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Supplier Portal
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Thank you for partnering with Annix.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Onboarding Approved - Annix Supplier Portal',
      html,
    });
  }

  async sendSupplierRejectionEmail(
    email: string,
    companyName: string,
    reason: string,
    remediationSteps: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const onboardingLink = `${frontendUrl}/supplier/portal/onboarding`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Onboarding Update Required - Annix Supplier Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Action Required</h1>
          <p>Your supplier onboarding for <strong>${companyName}</strong> requires updates before approval.</p>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <strong>Reason:</strong>
            <p style="margin: 5px 0 0 0;">${reason}</p>
          </div>

          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Steps to Resolve:</strong>
            <p style="margin: 5px 0 0 0; white-space: pre-line;">${remediationSteps}</p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${onboardingLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Update Onboarding
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you have questions, please contact our support team.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Action Required - Annix Supplier Onboarding',
      html,
    });
  }
}
