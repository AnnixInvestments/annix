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

  // Customer Portal Email Methods

  async sendCustomerVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/customer/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - Annix Customer Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to Annix Customer Portal</h1>
          <p>Thank you for registering. Please verify your email address to complete your registration.</p>
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
            If you did not register for an Annix Customer account, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Annix Customer Portal

      Thank you for registering. Please verify your email address to complete your registration.

      Click here to verify: ${verificationLink}

      This link will expire in 24 hours.

      If you did not register for an Annix Customer account, please ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Annix Customer Portal',
      html,
      text,
    });
  }

  async sendCustomerOnboardingApprovalEmail(email: string, companyName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const portalLink = `${frontendUrl}/customer/portal/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Onboarding Approved - Annix Customer Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #16a34a;">Congratulations!</h1>
          <p>Your customer onboarding for <strong>${companyName}</strong> has been approved.</p>
          <p>You can now access all customer portal features, including:</p>
          <ul>
            <li>Create and manage RFQs</li>
            <li>View quotations from suppliers</li>
            <li>Manage your preferential suppliers</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${portalLink}"
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Customer Portal
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Thank you for choosing Annix.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Onboarding Approved - Annix Customer Portal',
      html,
    });
  }

  async sendCustomerOnboardingRejectionEmail(
    email: string,
    companyName: string,
    reason: string,
    remediationSteps: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const onboardingLink = `${frontendUrl}/customer/portal/onboarding`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Onboarding Update Required - Annix Customer Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Action Required</h1>
          <p>Your customer onboarding for <strong>${companyName}</strong> requires updates before approval.</p>

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
      subject: 'Action Required - Annix Customer Onboarding',
      html,
    });
  }

  async sendSupplierInvitationEmail(
    email: string,
    customerCompanyName: string,
    invitationToken: string,
    message?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const registerLink = `${frontendUrl}/supplier/register?invitation=${invitationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Supplier Invitation - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">You've Been Invited!</h1>
          <p><strong>${customerCompanyName}</strong> has invited you to register as a supplier on the Annix platform.</p>
          ${message ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Message from ${customerCompanyName}:</strong>
            <p style="margin: 5px 0 0 0;">${message}</p>
          </div>
          ` : ''}
          <p>As a registered supplier, you'll be able to:</p>
          <ul>
            <li>Receive RFQ notifications</li>
            <li>Submit competitive quotations</li>
            <li>Build your business relationship with ${customerCompanyName}</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${registerLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Register as Supplier
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${registerLink}</p>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not expect this invitation, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Supplier Invitation from ${customerCompanyName} - Annix`,
      html,
    });
  }

  async sendManualReviewNotification(
    companyName: string,
    customerEmail: string,
    customerId: number,
    documentType: string,
    reason: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const adminLink = `${frontendUrl}/admin/customers/${customerId}`;
    const supportEmail = this.configService.get<string>('SUPPORT_EMAIL') || 'info@annix.co.za';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Manual Review Required - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Manual Document Review Required</h1>
          <p>A customer registration requires manual document verification.</p>

          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Customer Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Company:</strong> ${companyName}<br/>
              <strong>Email:</strong> ${customerEmail}<br/>
              <strong>Customer ID:</strong> ${customerId}
            </p>
          </div>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <strong>Document Issue:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Document Type:</strong> ${documentType}<br/>
              <strong>Reason:</strong> ${reason}
            </p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${adminLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Customer Documents
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from the Annix platform.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: supportEmail,
      subject: `Manual Review Required - ${companyName} Registration`,
      html,
    });
  }

  // Admin Portal Email Methods

  async sendAdminWelcomeEmail(
    email: string,
    name: string,
    temporaryPassword: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const adminLoginLink = `${frontendUrl}/admin/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Annix Admin Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to Annix Admin Portal</h1>
          <p>Hello ${name},</p>
          <p>Your administrator account has been created for the Annix Admin Portal.</p>

          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Your Login Credentials:</strong>
            <p style="margin: 10px 0 0 0;">
              <strong>Email:</strong> ${email}<br/>
              <strong>Temporary Password:</strong> <code style="background-color: #e0e7ff; padding: 2px 6px; border-radius: 3px;">${temporaryPassword}</code>
            </p>
          </div>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <strong>Important Security Notice:</strong>
            <p style="margin: 5px 0 0 0;">
              You will be required to change this temporary password upon your first login.
              Please keep this password secure and do not share it with anyone.
            </p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${adminLoginLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Login to Admin Portal
            </a>
          </p>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${adminLoginLink}</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not expect this email or believe you received it in error, please contact your system administrator immediately.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Annix Admin Portal

      Hello ${name},

      Your administrator account has been created for the Annix Admin Portal.

      Your Login Credentials:
      Email: ${email}
      Temporary Password: ${temporaryPassword}

      IMPORTANT: You will be required to change this temporary password upon your first login.

      Login here: ${adminLoginLink}

      If you did not expect this email or believe you received it in error, please contact your system administrator immediately.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Annix Admin Portal - Your Account Details',
      html,
      text,
    });
  }
}
