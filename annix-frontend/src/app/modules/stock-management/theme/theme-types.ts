export interface StockManagementThemeTokens {
  primaryColor: string;
  primaryHoverColor: string;
  primaryTextColor: string;
  accentColor: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  borderColor: string;
  textColor: string;
  textMutedColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  fontFamily: string;
  borderRadius: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export type StockManagementThemeOverrides = Partial<StockManagementThemeTokens>;
