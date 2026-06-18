export const WHATSAPP_CONSENT_TEMPLATE_NAME = "whatsapp_consent_request";
export const WHATSAPP_CONSENT_TEMPLATE_LANG = "en";
export const WHATSAPP_CONSENT_REPLY_TEXT = "Yes, I consent";

export function isConsentReply(body: string): boolean {
  return body.trim().toLowerCase() === WHATSAPP_CONSENT_REPLY_TEXT.toLowerCase();
}
