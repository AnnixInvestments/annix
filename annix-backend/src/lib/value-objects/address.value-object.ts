export interface AddressParts {
  streetAddress?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
}

const normalize = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export class Address {
  readonly streetAddress: string | null;
  readonly city: string | null;
  readonly province: string | null;
  readonly postalCode: string | null;

  private constructor(
    streetAddress: string | null,
    city: string | null,
    province: string | null,
    postalCode: string | null,
  ) {
    this.streetAddress = streetAddress;
    this.city = city;
    this.province = province;
    this.postalCode = postalCode;
  }

  static fromParts(parts: AddressParts): Address {
    return new Address(
      normalize(parts.streetAddress),
      normalize(parts.city),
      normalize(parts.province),
      normalize(parts.postalCode),
    );
  }

  isEmpty(): boolean {
    return (
      this.streetAddress == null &&
      this.city == null &&
      this.province == null &&
      this.postalCode == null
    );
  }

  formatted(): string | null {
    const parts = [this.streetAddress, this.city, this.province, this.postalCode].filter(
      (part): part is string => part != null,
    );
    return parts.length === 0 ? null : parts.join(", ");
  }
}
