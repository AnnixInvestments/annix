export interface FormatCurrencyOptions {
  decimals?: number;
  symbol?: string;
  locale?: string;
}

export const formatCurrency = (value: number, options: FormatCurrencyOptions = {}): string => {
  const symbol = options.symbol ?? "R";
  const locale = options.locale ?? "en-ZA";
  const decimals = options.decimals;

  if (decimals === undefined) {
    return `${symbol} ${value.toLocaleString(locale)}`;
  }

  return `${symbol} ${value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};
