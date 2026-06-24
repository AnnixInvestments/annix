import { Address } from "./address.value-object";
import { ContactDetails } from "./contact-details.value-object";

describe("Address", () => {
  it("trims and normalizes empty parts to null", () => {
    const address = Address.fromParts({
      streetAddress: "  12 Main Rd  ",
      city: "",
      province: "   ",
      postalCode: null,
    });

    expect(address.streetAddress).toBe("12 Main Rd");
    expect(address.city).toBeNull();
    expect(address.province).toBeNull();
    expect(address.postalCode).toBeNull();
  });

  it("treats undefined parts as null", () => {
    const address = Address.fromParts({});

    expect(address.streetAddress).toBeNull();
    expect(address.isEmpty()).toBe(true);
    expect(address.formatted()).toBeNull();
  });

  it("formats present parts as a single SA-style line", () => {
    const address = Address.fromParts({
      streetAddress: "12 Main Rd",
      city: "Cape Town",
      postalCode: "8001",
    });

    expect(address.isEmpty()).toBe(false);
    expect(address.formatted()).toBe("12 Main Rd, Cape Town, 8001");
  });
});

describe("ContactDetails", () => {
  it("trims phone and lowercases email", () => {
    const contact = ContactDetails.fromParts({
      phone: "  012 345 6789 ",
      email: "  Info@Annix.CO.ZA  ",
    });

    expect(contact.phone).toBe("012 345 6789");
    expect(contact.email).toBe("info@annix.co.za");
  });

  it("normalizes empty values to null", () => {
    const contact = ContactDetails.fromParts({ phone: "", email: null });

    expect(contact.phone).toBeNull();
    expect(contact.email).toBeNull();
    expect(contact.isEmpty()).toBe(true);
  });
});
