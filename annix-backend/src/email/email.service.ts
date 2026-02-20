import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

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
    const host = this.configService.get<string>("SMTP_HOST");
    const port = this.configService.get<number>("SMTP_PORT");
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");

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
      this.logger.log("Email transporter configured successfully");
    } else {
      this.logger.warn("SMTP not configured - emails will be logged to console");
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const from = this.configService.get<string>("EMAIL_FROM") || "noreply@annix.com";

    if (!this.isConfigured) {
      this.logger.log("=== EMAIL (Console Mode) ===");
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`From: ${from}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body: ${options.text || options.html}`);
      this.logger.log("=== END EMAIL ===");
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

  async sendSupplierVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Verify Your Email - Annix Supplier Portal",
      html,
      text,
    });
  }

  async sendSupplierApprovalEmail(email: string, companyName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Onboarding Approved - Annix Supplier Portal",
      html,
    });
  }

  async sendSupplierRejectionEmail(
    email: string,
    companyName: string,
    reason: string,
    remediationSteps: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Action Required - Annix Supplier Onboarding",
      html,
    });
  }

  async sendStockControlVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const verificationLink = `${frontendUrl}/stock-control/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - ASCA Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0d9488;">Welcome to ASCA Stock Control</h1>
          <p>Thank you for registering. Please verify your email address to complete your registration and access the stock control system.</p>
          <p style="margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not register for an ASCA Stock Control account, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to ASCA Stock Control

      Thank you for registering. Please verify your email address to complete your registration and access the stock control system.

      Click here to verify: ${verificationLink}

      This link will expire in 24 hours.

      If you did not register for an ASCA Stock Control account, please ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: "Verify Your Email - ASCA Stock Control",
      html,
      text,
    });
  }

  // Customer Portal Email Methods

  async sendCustomerVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Verify Your Email - Annix Customer Portal",
      html,
      text,
    });
  }

  async sendCustomerOnboardingApprovalEmail(email: string, companyName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Onboarding Approved - Annix Customer Portal",
      html,
    });
  }

  async sendCustomerOnboardingRejectionEmail(
    email: string,
    companyName: string,
    reason: string,
    remediationSteps: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Action Required - Annix Customer Onboarding",
      html,
    });
  }

  async sendSupplierInvitationEmail(
    email: string,
    customerCompanyName: string,
    invitationToken: string,
    message?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
          ${
            message
              ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Message from ${customerCompanyName}:</strong>
            <p style="margin: 5px 0 0 0;">${message}</p>
          </div>
          `
              : ""
          }
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
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const adminLink = `${frontendUrl}/admin/customers/${customerId}`;
    const supportEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";

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

  async sendSupplierManualReviewNotification(
    companyName: string,
    supplierEmail: string,
    supplierId: number,
    documentType: string,
    reason: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const adminLink = `${frontendUrl}/admin/suppliers/${supplierId}`;
    const supportEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";

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
          <p>A supplier registration requires manual document verification.</p>

          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Supplier Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Company:</strong> ${companyName}<br/>
              <strong>Email:</strong> ${supplierEmail}<br/>
              <strong>Supplier ID:</strong> ${supplierId}
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
              Review Supplier Documents
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
      subject: `Manual Review Required - ${companyName} Supplier Registration`,
      html,
    });
  }

  // Admin Portal Email Methods

  async sendCustomerInvitationEmail(
    email: string,
    inviterName: string,
    message?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const registerLink = `${frontendUrl}/customer/register?email=${encodeURIComponent(email)}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Customer Invitation - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">You're Invited to Annix</h1>
          <p>${inviterName} has invited you to register as a customer on the Annix platform.</p>
          ${
            message
              ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Message:</strong>
            <p style="margin: 5px 0 0 0;">${message}</p>
          </div>
          `
              : ""
          }
          <p>As a registered customer, you'll be able to:</p>
          <ul>
            <li>Create and manage Requests for Quotation (RFQs)</li>
            <li>Connect with verified suppliers</li>
            <li>Track your orders and quotes</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${registerLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Register Now
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${registerLink}</p>
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
      subject: `You're Invited to Annix - Customer Registration`,
      html,
    });
  }

  async sendSupplierAdminInvitationEmail(
    email: string,
    inviterName: string,
    message?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const registerLink = `${frontendUrl}/supplier/register?email=${encodeURIComponent(email)}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Supplier Invitation - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">You're Invited to Annix</h1>
          <p>${inviterName} has invited you to register as a supplier on the Annix platform.</p>
          ${
            message
              ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Message:</strong>
            <p style="margin: 5px 0 0 0;">${message}</p>
          </div>
          `
              : ""
          }
          <p>As a registered supplier, you'll be able to:</p>
          <ul>
            <li>Receive RFQ notifications</li>
            <li>Submit competitive quotations</li>
            <li>Grow your business with new customers</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${registerLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Register Now
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${registerLink}</p>
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
      subject: `You're Invited to Annix - Supplier Registration`,
      html,
    });
  }

  // BOQ Distribution Email Methods

  async sendSupplierBoqNotification(
    email: string,
    supplierName: string,
    projectName: string,
    boqNumber: string,
    sections: string[],
    customerDetails?: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
    },
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const boqLink = `${frontendUrl}/supplier/portal/boqs`;

    const sectionsList = sections.map((s) => `<li>${s}</li>`).join("");

    const customerSection = customerDetails
      ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
          <strong>Customer Details:</strong>
          <p style="margin: 5px 0 0 0;">
            ${customerDetails.company ? `<strong>Company:</strong> ${customerDetails.company}<br/>` : ""}
            <strong>Contact:</strong> ${customerDetails.name}<br/>
            <strong>Email:</strong> ${customerDetails.email}
            ${customerDetails.phone ? `<br/><strong>Phone:</strong> ${customerDetails.phone}` : ""}
          </p>
        </div>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New BOQ Request - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">New BOQ Request</h1>
          <p>Hello ${supplierName},</p>
          <p>You have been invited to quote on a new Bill of Quantities (BOQ).</p>

          <div style="background-color: #f3f4f6; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
            <strong>Project Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Project:</strong> ${projectName}<br/>
              <strong>BOQ Number:</strong> ${boqNumber}
            </p>
          </div>

          <p><strong>Sections you can quote on:</strong></p>
          <ul>
            ${sectionsList}
          </ul>

          ${customerSection}

          <p style="margin: 30px 0;">
            <a href="${boqLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View BOQ Details
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

    const text = `
      New BOQ Request

      Hello ${supplierName},

      You have been invited to quote on a new Bill of Quantities (BOQ).

      Project: ${projectName}
      BOQ Number: ${boqNumber}

      Sections you can quote on:
      ${sections.map((s) => `- ${s}`).join("\n")}

      ${customerDetails ? `Customer: ${customerDetails.company || customerDetails.name}` : ""}

      View the BOQ at: ${boqLink}
    `;

    return this.sendEmail({
      to: email,
      subject: `New BOQ Request: ${projectName} (${boqNumber}) - Annix`,
      html,
      text,
    });
  }

  async sendBoqUpdateNotification(
    email: string,
    supplierName: string,
    projectName: string,
    boqNumber: string,
    sections: string[],
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const boqLink = `${frontendUrl}/supplier/portal/boqs`;

    const sectionsList = sections.map((s) => `<li>${s}</li>`).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>BOQ Updated - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f59e0b;">BOQ Updated</h1>
          <p>Hello ${supplierName},</p>
          <p>A Bill of Quantities (BOQ) you were invited to quote on has been updated by the customer.</p>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>Updated BOQ:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Project:</strong> ${projectName}<br/>
              <strong>BOQ Number:</strong> ${boqNumber}
            </p>
          </div>

          <p><strong>Sections available to you:</strong></p>
          <ul>
            ${sectionsList}
          </ul>

          <p style="margin: 30px 0;">
            <a href="${boqLink}"
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Updated BOQ
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            Please review the updated requirements and adjust your quotation if needed.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `BOQ Updated: ${projectName} (${boqNumber}) - Annix`,
      html,
    });
  }

  async sendAdminWelcomeEmail(
    email: string,
    name: string,
    temporaryPassword: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
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
      subject: "Welcome to Annix Admin Portal - Your Account Details",
      html,
      text,
    });
  }

  async sendRfqUpdateNotification(
    email: string,
    supplierName: string,
    projectName: string,
    rfqNumber: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const rfqLink = `${frontendUrl}/supplier/portal/boqs`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>RFQ Updated - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f59e0b;">RFQ Updated</h1>
          <p>Hello ${supplierName},</p>
          <p>A Request for Quotation (RFQ) you were invited to quote on has been updated by the customer.</p>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>Updated RFQ:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Project:</strong> ${projectName}<br/>
              <strong>RFQ Number:</strong> ${rfqNumber}
            </p>
          </div>

          <p>Please review the updated requirements and adjust your quotation if needed.</p>

          <p style="margin: 30px 0;">
            <a href="${rfqLink}"
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Updated RFQ
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you have already submitted a quote, please review the changes and submit an updated quote if necessary.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `RFQ Updated: ${projectName} (${rfqNumber}) - Annix`,
      html,
    });
  }

  async sendBeeExpiryNotificationEmail(
    email: string,
    companyName: string,
    contactName: string,
    expiryDate: string,
    beeLevel: number | null,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const documentsLink = `${frontendUrl}/customer/portal/documents`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>BEE Certificate Expiry Notice - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #b45309; margin: 0 0 10px 0;">BEE Certificate Expiry Notice</h2>
            <p style="margin: 0; color: #92400e;">Your BEE certificate has expired or is expiring today.</p>
          </div>

          <p>Dear ${contactName},</p>

          <p>This is a reminder that the BEE certificate for <strong>${companyName}</strong> has reached its expiry date.</p>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Company:</td>
                <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Current BEE Level:</td>
                <td style="padding: 8px 0; font-weight: bold;">${beeLevel !== null ? `Level ${beeLevel}` : "Not specified"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Expiry Date:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${expiryDate}</td>
              </tr>
            </table>
          </div>

          <p><strong>Action Required:</strong></p>
          <p>Please upload your renewed BEE certificate as soon as possible to ensure continued compliance. You can upload your new certificate through the customer portal.</p>

          <p style="margin: 30px 0;">
            <a href="${documentsLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Upload New BEE Certificate
            </a>
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            Once uploaded, your new certificate will be verified by our system. If additional review is required, our admin team will review and approve it.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Annix. If you have already renewed your certificate, please upload it at your earliest convenience.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
BEE Certificate Expiry Notice

Dear ${contactName},

This is a reminder that the BEE certificate for ${companyName} has reached its expiry date.

Company: ${companyName}
Current BEE Level: ${beeLevel !== null ? `Level ${beeLevel}` : "Not specified"}
Expiry Date: ${expiryDate}

Action Required:
Please upload your renewed BEE certificate as soon as possible to ensure continued compliance.

Upload your new certificate here: ${documentsLink}

Once uploaded, your new certificate will be verified by our system.

Thank you,
Annix Team
    `;

    return this.sendEmail({
      to: email,
      subject: `BEE Certificate Expiry Notice - ${companyName} - Annix`,
      html,
      text,
    });
  }

  async sendMeetingSummaryEmail(
    recipientEmail: string,
    recipientName: string,
    meetingDetails: {
      title: string;
      date: string;
      duration: string;
      attendees: string[];
      companyName?: string;
    },
    summary: {
      overview: string;
      keyPoints: string[];
      actionItems: Array<{
        task: string;
        assignee: string | null;
        dueDate: string | null;
      }>;
      nextSteps: string[];
      topics: string[];
      sentiment?: string;
    },
    transcriptUrl?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    const attendeesList =
      meetingDetails.attendees.length > 0
        ? meetingDetails.attendees.map((a) => `<li>${a}</li>`).join("")
        : "<li>Not specified</li>";

    const keyPointsList =
      summary.keyPoints.length > 0
        ? summary.keyPoints.map((p) => `<li>${p}</li>`).join("")
        : "<li>No key points identified</li>";

    const actionItemsList =
      summary.actionItems.length > 0
        ? summary.actionItems
            .map(
              (item) =>
                `<li>
                <strong>${item.task}</strong>
                ${item.assignee ? `<br/><span style="color: #6b7280; font-size: 13px;">Assigned to: ${item.assignee}</span>` : ""}
                ${item.dueDate ? `<br/><span style="color: #6b7280; font-size: 13px;">Due: ${item.dueDate}</span>` : ""}
              </li>`,
            )
            .join("")
        : "<li>No action items identified</li>";

    const nextStepsList =
      summary.nextSteps.length > 0
        ? summary.nextSteps.map((s) => `<li>${s}</li>`).join("")
        : "<li>No specific next steps identified</li>";

    const topicsTags =
      summary.topics.length > 0
        ? summary.topics
            .map(
              (t) =>
                `<span style="display: inline-block; background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 12px; font-size: 13px; margin: 2px 4px 2px 0;">${t}</span>`,
            )
            .join("")
        : "<span style='color: #6b7280;'>No topics identified</span>";

    const sentimentBadge = summary.sentiment
      ? (() => {
          const colors: Record<string, { bg: string; text: string }> = {
            positive: { bg: "#dcfce7", text: "#166534" },
            neutral: { bg: "#f3f4f6", text: "#374151" },
            negative: { bg: "#fee2e2", text: "#991b1b" },
          };
          const color = colors[summary.sentiment] || colors.neutral;
          return `<span style="display: inline-block; background-color: ${color.bg}; color: ${color.text}; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">${summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)} Meeting</span>`;
        })()
      : "";

    const transcriptSection = transcriptUrl
      ? `
        <p style="margin: 20px 0;">
          <a href="${transcriptUrl}"
             style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
            View Full Transcript
          </a>
        </p>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Meeting Summary - ${meetingDetails.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb;">
        <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px;">
              <h1 style="margin: 0 0 10px 0; font-size: 24px;">Meeting Summary</h1>
              <p style="margin: 0; font-size: 18px; opacity: 0.95;">${meetingDetails.title}</p>
              ${meetingDetails.companyName ? `<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.85;">${meetingDetails.companyName}</p>` : ""}
            </div>

            <!-- Meeting Info -->
            <div style="padding: 25px; border-bottom: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 100px;">Date:</td>
                  <td style="padding: 8px 0; font-weight: 500;">${meetingDetails.date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Duration:</td>
                  <td style="padding: 8px 0; font-weight: 500;">${meetingDetails.duration}</td>
                </tr>
              </table>
              <div style="margin-top: 15px;">
                <span style="color: #6b7280;">Attendees:</span>
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  ${attendeesList}
                </ul>
              </div>
              ${sentimentBadge ? `<div style="margin-top: 15px;">${sentimentBadge}</div>` : ""}
            </div>

            <!-- Overview -->
            <div style="padding: 25px; border-bottom: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 4px; height: 20px; background-color: #2563eb; border-radius: 2px; margin-right: 10px;"></span>
                Overview
              </h2>
              <p style="margin: 0; color: #374151; line-height: 1.7;">${summary.overview}</p>
            </div>

            <!-- Topics -->
            <div style="padding: 25px; border-bottom: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 4px; height: 20px; background-color: #8b5cf6; border-radius: 2px; margin-right: 10px;"></span>
                Topics Discussed
              </h2>
              <div>${topicsTags}</div>
            </div>

            <!-- Key Points -->
            <div style="padding: 25px; border-bottom: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 4px; height: 20px; background-color: #10b981; border-radius: 2px; margin-right: 10px;"></span>
                Key Points
              </h2>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${keyPointsList}
              </ul>
            </div>

            <!-- Action Items -->
            <div style="padding: 25px; border-bottom: 1px solid #e5e7eb; background-color: #fffbeb;">
              <h2 style="color: #92400e; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 4px; height: 20px; background-color: #f59e0b; border-radius: 2px; margin-right: 10px;"></span>
                Action Items
              </h2>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${actionItemsList}
              </ul>
            </div>

            <!-- Next Steps -->
            <div style="padding: 25px;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center;">
                <span style="display: inline-block; width: 4px; height: 20px; background-color: #06b6d4; border-radius: 2px; margin-right: 10px;"></span>
                Next Steps
              </h2>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${nextStepsList}
              </ul>
              ${transcriptSection}
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">This summary was automatically generated from meeting transcript.</p>
            <p style="margin: 5px 0 0 0;">Powered by Annix Rep</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textActionItems = summary.actionItems
      .map((item) => `  - ${item.task}${item.assignee ? ` (Assigned to: ${item.assignee})` : ""}`)
      .join("\n");

    const text = `
MEETING SUMMARY
===============

${meetingDetails.title}
${meetingDetails.companyName ? `Company: ${meetingDetails.companyName}` : ""}

Date: ${meetingDetails.date}
Duration: ${meetingDetails.duration}
Attendees: ${meetingDetails.attendees.join(", ") || "Not specified"}

OVERVIEW
--------
${summary.overview}

TOPICS DISCUSSED
----------------
${summary.topics.join(", ") || "None identified"}

KEY POINTS
----------
${summary.keyPoints.map((p) => `- ${p}`).join("\n") || "None identified"}

ACTION ITEMS
------------
${textActionItems || "None identified"}

NEXT STEPS
----------
${summary.nextSteps.map((s) => `- ${s}`).join("\n") || "None identified"}

---
This summary was automatically generated from meeting transcript.
Powered by Annix Rep
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `Meeting Summary: ${meetingDetails.title} - ${meetingDetails.date}`,
      html,
      text,
    });
  }

  async sendFollowUpReminderEmail(
    email: string,
    recipientName: string,
    prospects: Array<{ id: number; companyName: string; nextFollowUpAt: Date | null }>,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const prospectsLink = `${frontendUrl}/annix-rep/prospects`;

    const prospectsList = prospects
      .map(
        (p) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <a href="${frontendUrl}/annix-rep/prospects/${p.id}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
              ${p.companyName}
            </a>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">
            ${p.nextFollowUpAt ? new Date(p.nextFollowUpAt).toLocaleDateString("en-ZA") : "Not set"}
          </td>
        </tr>
      `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Follow-Up Reminder - Annix Rep</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
            <h1 style="color: #b45309; margin: 0 0 10px 0; font-size: 20px;">Follow-Up Reminder</h1>
            <p style="margin: 0; color: #92400e;">You have ${prospects.length} overdue follow-up${prospects.length === 1 ? "" : "s"}</p>
          </div>

          <p>Hello ${recipientName},</p>

          <p>The following prospects have overdue follow-ups that need your attention:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Company</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${prospectsList}
            </tbody>
          </table>

          <p style="margin: 30px 0;">
            <a href="${prospectsLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Prospects
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated daily reminder from Annix Rep.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
Follow-Up Reminder

Hello ${recipientName},

You have ${prospects.length} overdue follow-up${prospects.length === 1 ? "" : "s"}:

${prospects.map((p) => `- ${p.companyName} (Due: ${p.nextFollowUpAt ? new Date(p.nextFollowUpAt).toLocaleDateString("en-ZA") : "Not set"})`).join("\n")}

View your prospects: ${prospectsLink}

This is an automated daily reminder from Annix Rep.
    `;

    return this.sendEmail({
      to: email,
      subject: `Follow-Up Reminder: ${prospects.length} overdue prospect${prospects.length === 1 ? "" : "s"} - Annix Rep`,
      html,
      text,
    });
  }

  async sendCustomerFeedbackNotificationEmail(
    recipientEmail: string,
    customerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      companyName: string;
    },
    feedbackContent: string,
    source: "text" | "voice",
    pageUrl: string | null,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const messageBoardLink = `${frontendUrl}/admin/messages/broadcasts`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Customer Feedback Received - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Customer Feedback Received</h1>
          <p>A customer has submitted feedback on the test site.</p>

          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Customer Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Name:</strong> ${customerInfo.firstName} ${customerInfo.lastName}<br/>
              <strong>Company:</strong> ${customerInfo.companyName}<br/>
              <strong>Email:</strong> ${customerInfo.email}
            </p>
          </div>

          <div style="background-color: #f0f9ff; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <strong>Feedback:</strong>
            <p style="margin: 10px 0 0 0; white-space: pre-line;">${feedbackContent}</p>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>Submission Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Source:</strong> ${source === "voice" ? "Voice recording" : "Text input"}<br/>
              <strong>Page:</strong> ${pageUrl || "Unknown page"}
            </p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${messageBoardLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Admin Message Board
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from the Annix test site.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
Customer Feedback Received

A customer has submitted feedback on the test site.

Customer Details:
- Name: ${customerInfo.firstName} ${customerInfo.lastName}
- Company: ${customerInfo.companyName}
- Email: ${customerInfo.email}

Feedback:
${feedbackContent}

Submission Details:
- Source: ${source === "voice" ? "Voice recording" : "Text input"}
- Page: ${pageUrl || "Unknown page"}

View in Admin Message Board: ${messageBoardLink}

This is an automated notification from the Annix test site.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `Customer Feedback - ${customerInfo.companyName} - Annix Test Site`,
      html,
      text,
    });
  }
}
