import { encrypt, decrypt } from './crypto.util';

describe('Crypto Utilities', () => {
  const validKey = 'a'.repeat(64);

  describe('encrypt', () => {
    it('should encrypt plaintext and return a buffer', () => {
      const plaintext = 'Hello, World!';
      const result = encrypt(plaintext, validKey);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(plaintext.length);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same text';
      const result1 = encrypt(plaintext, validKey);
      const result2 = encrypt(plaintext, validKey);

      expect(result1.equals(result2)).toBe(false);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted content back to original plaintext', () => {
      const plaintext = 'Secret credentials: password123';
      const encrypted = encrypt(plaintext, validKey);
      const decrypted = decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext =
        'Unicode test: \u00e9\u00e8\u00ea \u4e2d\u6587 \ud83d\udd12';
      const encrypted = encrypt(plaintext, validKey);
      const decrypted = decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext, validKey);
      const decrypted = decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large content', () => {
      const plaintext = 'x'.repeat(100000);
      const encrypted = encrypt(plaintext, validKey);
      const decrypted = decrypt(encrypted, validKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong key', () => {
      const plaintext = 'Secret data';
      const encrypted = encrypt(plaintext, validKey);
      const wrongKey = 'b'.repeat(64);

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should fail with tampered auth tag', () => {
      const plaintext = 'Secret data';
      const encrypted = encrypt(plaintext, validKey);
      const lastByte = encrypted.length - 1;
      encrypted[lastByte] = encrypted[lastByte] ^ 0xff;

      expect(() => decrypt(encrypted, validKey)).toThrow();
    });
  });

  describe('roundtrip', () => {
    it('should encrypt and decrypt markdown content', () => {
      const markdown = `# Deployment Credentials

## Database
- Host: db.example.com
- Password: super_secret_123

## API Keys
\`\`\`
API_KEY=abc123xyz
SECRET_KEY=def456uvw
\`\`\`
`;
      const encrypted = encrypt(markdown, validKey);
      const decrypted = decrypt(encrypted, validKey);

      expect(decrypted).toBe(markdown);
    });
  });
});
