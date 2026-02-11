import { isString } from "es-toolkit/compat";

export enum ColumnTypeCategory {
  Numeric = "numeric",
  Boolean = "boolean",
  String = "string",
  Date = "date",
  Timestamp = "timestamp",
}

const NUMERIC_TYPES = new Set([
  "number",
  "int",
  "integer",
  "float",
  "decimal",
  "double",
  "bigint",
  "smallint",
]);

const BOOLEAN_TYPES = new Set(["boolean", "bool"]);

const DATE_TYPES = new Set(["date"]);

const TIMESTAMP_TYPES = new Set([
  "timestamp",
  "timestamptz",
  "timestamp with time zone",
  "timestamp without time zone",
  "datetime",
]);

export function categoryForColumnType(type: string): ColumnTypeCategory {
  if (NUMERIC_TYPES.has(type)) return ColumnTypeCategory.Numeric;
  if (BOOLEAN_TYPES.has(type)) return ColumnTypeCategory.Boolean;
  if (DATE_TYPES.has(type)) return ColumnTypeCategory.Date;
  if (TIMESTAMP_TYPES.has(type)) return ColumnTypeCategory.Timestamp;
  return ColumnTypeCategory.String;
}

export enum HtmlInputType {
  Number = "number",
  Checkbox = "checkbox",
  Date = "date",
  DatetimeLocal = "datetime-local",
  Text = "text",
}

export function htmlInputType(type: string): HtmlInputType {
  const category = categoryForColumnType(type);
  if (category === ColumnTypeCategory.Numeric) return HtmlInputType.Number;
  if (category === ColumnTypeCategory.Boolean) return HtmlInputType.Checkbox;
  if (category === ColumnTypeCategory.Date) return HtmlInputType.Date;
  if (category === ColumnTypeCategory.Timestamp) return HtmlInputType.DatetimeLocal;
  return HtmlInputType.Text;
}

export function coerceFormValue(value: any, type: string): any {
  if (value === "" || value === null || value === undefined) return null;
  const category = categoryForColumnType(type);
  if (category === ColumnTypeCategory.Numeric) return Number(value);
  if (category === ColumnTypeCategory.Boolean) return Boolean(value);
  if (category === ColumnTypeCategory.Date || category === ColumnTypeCategory.Timestamp) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : value;
  }
  return value;
}

export function isNumericType(type: string): boolean {
  return categoryForColumnType(type) === ColumnTypeCategory.Numeric;
}

export function isDateLikeType(type: string): boolean {
  const category = categoryForColumnType(type);
  return category === ColumnTypeCategory.Date || category === ColumnTypeCategory.Timestamp;
}

export function isStringType(type: string): boolean {
  return categoryForColumnType(type) === ColumnTypeCategory.String;
}

export function formatDefaultValue(value: any, type: string): string {
  if (value === null || value === undefined) return "";
  const category = categoryForColumnType(type);
  if (category === ColumnTypeCategory.Date && isString(value)) {
    return value.substring(0, 10);
  }
  if (category === ColumnTypeCategory.Timestamp && isString(value)) {
    return value.substring(0, 16);
  }
  return String(value);
}
