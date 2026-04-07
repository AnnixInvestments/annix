export interface EmailCtaOptions {
  href: string;
  label: string;
  color: string;
  showLinkFallback?: boolean;
  expiryNote?: string | null;
}

export interface EmailLayoutOptions {
  title: string;
  heading: string;
  headingColor: string;
  bodyHtml: string;
  cta?: EmailCtaOptions | null;
  footerText?: string;
}

export function emailCtaButton(options: EmailCtaOptions): string {
  const linkFallback =
    options.showLinkFallback !== false
      ? `
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${options.href}</p>`
      : "";

  const expiry = options.expiryNote
    ? `
          <p style="color: #666; font-size: 14px;">${options.expiryNote}</p>`
    : "";

  return `
          <p style="margin: 30px 0;">
            <a href="${options.href}"
               style="background-color: ${options.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${options.label}
            </a>
          </p>${linkFallback}${expiry}`;
}

export function emailLayout(options: EmailLayoutOptions): string {
  const footer = options.footerText || "This is an automated notification from the Annix platform.";
  const ctaHtml = options.cta ? emailCtaButton(options.cta) : "";

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${options.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${options.headingColor};">${options.heading}</h1>
          ${options.bodyHtml}${ctaHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            ${footer}
          </p>
        </div>
      </body>
      </html>
    `;
}
