import { createHmac, randomBytes } from "node:crypto";

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessSecret: string;
}

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function oauth1Header(
  method: string,
  baseUrl: string,
  bodyParams: Record<string, string>,
  credentials: OAuth1Credentials,
  nonce: string,
  timestampSeconds: string,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestampSeconds,
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };
  const allParams = { ...oauthParams, ...bodyParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${rfc3986(key)}=${rfc3986(allParams[key])}`)
    .join("&");
  const signatureBase = `${method.toUpperCase()}&${rfc3986(baseUrl)}&${rfc3986(paramString)}`;
  const signingKey = `${rfc3986(credentials.consumerSecret)}&${rfc3986(credentials.accessSecret)}`;
  const signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");
  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const header = Object.keys(headerParams)
    .sort()
    .map((key) => `${rfc3986(key)}="${rfc3986(headerParams[key])}"`)
    .join(", ");
  return `OAuth ${header}`;
}

export function oauthNonce(): string {
  return randomBytes(16).toString("hex");
}
