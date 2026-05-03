/**
 * Browser autofill (especially password managers) often populates input values
 * without firing React's onChange. The visible DOM value is correct, but the
 * controlled-input React state stays empty, so submitting the form sends empty
 * fields to the backend (which then rejects with "must not be empty" / "must
 * be longer than N characters" validation errors).
 *
 * Usage in a controlled-input form's submit handler:
 *
 *   const handleSubmit = (e: React.FormEvent) => {
 *     e.preventDefault();
 *     const form = e.currentTarget as HTMLFormElement;
 *     const finalEmail = readFieldWithDomFallback(email, form, "email");
 *     const finalPassword = readFieldWithDomFallback(password, form, "password");
 *     await login(finalEmail, finalPassword);
 *   };
 */
export function readFieldWithDomFallback(
  reactValue: string,
  formElement: HTMLFormElement | null,
  fieldName: string,
): string {
  if (reactValue && reactValue.trim() !== "") {
    return reactValue;
  }
  if (!formElement) {
    return reactValue;
  }
  const namedItem = formElement.elements.namedItem(fieldName);
  if (!(namedItem instanceof HTMLInputElement)) {
    return reactValue;
  }
  const domValue = namedItem.value;
  if (domValue) {
    return domValue;
  }
  return reactValue;
}
