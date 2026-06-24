export interface ContactDetailsParts {
  phone?: string | null;
  email?: string | null;
}

const normalize = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export class ContactDetails {
  readonly phone: string | null;
  readonly email: string | null;

  private constructor(phone: string | null, email: string | null) {
    this.phone = phone;
    this.email = email;
  }

  static fromParts(parts: ContactDetailsParts): ContactDetails {
    const email = normalize(parts.email);
    return new ContactDetails(normalize(parts.phone), email == null ? null : email.toLowerCase());
  }

  isEmpty(): boolean {
    return this.phone == null && this.email == null;
  }
}
