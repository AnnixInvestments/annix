import { applyDecorators } from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsZAPhone } from "../../shared/validators";

interface StringOptions {
  maxLength?: number;
}

interface PhoneOptions {
  maxLength?: number;
  za?: boolean;
}

interface NumberOptions {
  min?: number;
  max?: number;
}

interface IntOptions extends NumberOptions {}

export const RequiredString = (options: StringOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsString(), IsNotEmpty()];
  if (options.maxLength !== undefined) decorators.push(MaxLength(options.maxLength));
  return applyDecorators(...decorators);
};

export const OptionalString = (options: StringOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsOptional(), IsString()];
  if (options.maxLength !== undefined) decorators.push(MaxLength(options.maxLength));
  return applyDecorators(...decorators);
};

export const RequiredEmail = (options: StringOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsEmail(), IsNotEmpty()];
  if (options.maxLength !== undefined) decorators.push(MaxLength(options.maxLength));
  return applyDecorators(...decorators);
};

export const OptionalEmail = (options: StringOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsOptional(), IsEmail()];
  if (options.maxLength !== undefined) decorators.push(MaxLength(options.maxLength));
  return applyDecorators(...decorators);
};

export const RequiredPhone = (options: PhoneOptions = {}): PropertyDecorator => {
  const maxLength = options.maxLength ?? 30;
  const decorators: PropertyDecorator[] = [IsString(), IsNotEmpty(), MaxLength(maxLength)];
  if (options.za !== false) decorators.push(IsZAPhone());
  return applyDecorators(...decorators);
};

export const OptionalPhone = (options: PhoneOptions = {}): PropertyDecorator => {
  const maxLength = options.maxLength ?? 30;
  const decorators: PropertyDecorator[] = [IsOptional(), IsString(), MaxLength(maxLength)];
  if (options.za !== false) decorators.push(IsZAPhone());
  return applyDecorators(...decorators);
};

export const RequiredInt = (options: IntOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsInt(), IsNotEmpty()];
  if (options.min !== undefined) decorators.push(Min(options.min));
  if (options.max !== undefined) decorators.push(Max(options.max));
  return applyDecorators(...decorators);
};

export const OptionalInt = (options: IntOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsOptional(), IsInt()];
  if (options.min !== undefined) decorators.push(Min(options.min));
  if (options.max !== undefined) decorators.push(Max(options.max));
  return applyDecorators(...decorators);
};

export const RequiredNumber = (options: NumberOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsNumber(), IsNotEmpty()];
  if (options.min !== undefined) decorators.push(Min(options.min));
  if (options.max !== undefined) decorators.push(Max(options.max));
  return applyDecorators(...decorators);
};

export const OptionalNumber = (options: NumberOptions = {}): PropertyDecorator => {
  const decorators: PropertyDecorator[] = [IsOptional(), IsNumber()];
  if (options.min !== undefined) decorators.push(Min(options.min));
  if (options.max !== undefined) decorators.push(Max(options.max));
  return applyDecorators(...decorators);
};

export const RequiredBoolean = (): PropertyDecorator => applyDecorators(IsBoolean(), IsNotEmpty());

export const OptionalBoolean = (): PropertyDecorator => applyDecorators(IsOptional(), IsBoolean());

export const RequiredIn = <T extends string>(values: readonly T[]): PropertyDecorator =>
  applyDecorators(IsString(), IsIn(values as unknown as T[]), IsNotEmpty());

export const OptionalIn = <T extends string>(values: readonly T[]): PropertyDecorator =>
  applyDecorators(IsOptional(), IsString(), IsIn(values as unknown as T[]));

export const RequiredDateString = (): PropertyDecorator =>
  applyDecorators(IsDateString(), IsNotEmpty());

export const OptionalDateString = (): PropertyDecorator =>
  applyDecorators(IsOptional(), IsDateString());

export const OptionalStringArray = (): PropertyDecorator =>
  applyDecorators(IsOptional(), IsArray(), IsString({ each: true }));

export const RequiredStringArray = (): PropertyDecorator =>
  applyDecorators(IsArray(), IsString({ each: true }), IsNotEmpty());
