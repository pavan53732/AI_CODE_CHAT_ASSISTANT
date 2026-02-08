// Project Bundle Security
// Implements AES-256 encryption and digital signing for .ai-project-bundle files

import { createCipheriv, createDecipheriv, createHash, createSign, createVerify, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface SecureBundle {
  version: string;
  encrypted: boolean;
  signed: boolean;
  data: string; // Base64 encoded encrypted data or JSON string
  iv?: string; // Base64 IV for encryption
  authTag?: string; // Base64 auth tag for GCM
  signature?: string; // Base64 signature
  timestamp: string;
}

export class ProjectBundleSecurity {
  private encryptionKey: Buffer | null = null;
  private signingKey: string | null = null;

  /**
   * Set encryption key (must be 32 bytes for AES-256)
   */
  setEncryptionKey(key: string): void {
    // Derive 32-byte key from password using SHA-256
    this.encryptionKey = createHash('sha256').update(key).digest();
  }

  /**
   * Set signing key (private key for signing)
   */
  setSigningKey(privateKey: string): void {
    this.signingKey = privateKey;
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.encryptionKey,
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Sign data with RSA private key
   */
  sign(data: string): string {
    if (!this.signingKey) {
      throw new Error('Signing key not set');
    }

    const signer = createSign('SHA256');
    signer.update(data);
    signer.end();

    return signer.sign(this.signingKey, 'base64');
  }

  /**
   * Verify signature with RSA public key
   */
  verify(data: string, signature: string, publicKey: string): boolean {
    const verifier = createVerify('SHA256');
    verifier.update(data);
    verifier.end();

    return verifier.verify(publicKey, signature, 'base64');
  }

  /**
   * Create a secure bundle with optional encryption and signing
   */
  createBundle(
    data: any,
    options: { encrypt?: boolean; sign?: boolean } = {}
  ): SecureBundle {
    const bundle: SecureBundle = {
      version: '1.0',
      encrypted: false,
      signed: false,
      data: '',
      timestamp: new Date().toISOString(),
    };

    let dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // Encrypt if requested and key is set
    if (options.encrypt && this.encryptionKey) {
      const encrypted = this.encrypt(dataString);
      bundle.data = encrypted.encrypted;
      bundle.iv = encrypted.iv;
      bundle.authTag = encrypted.authTag;
      bundle.encrypted = true;
    } else {
      bundle.data = dataString;
    }

    // Sign if requested and key is set
    if (options.sign && this.signingKey) {
      const signature = this.sign(bundle.data);
      bundle.signature = signature;
      bundle.signed = true;
    }

    return bundle;
  }

  /**
   * Extract data from a secure bundle
   */
  extractBundle(bundle: SecureBundle, publicKey?: string): any {
    let data = bundle.data;

    // Verify signature if present
    if (bundle.signed) {
      if (!publicKey) {
        throw new Error('Public key required to verify signature');
      }
      if (!bundle.signature) {
        throw new Error('Bundle claims to be signed but signature is missing');
      }
      const valid = this.verify(data, bundle.signature, publicKey);
      if (!valid) {
        throw new Error('Bundle signature verification failed');
      }
    }

    // Decrypt if encrypted
    if (bundle.encrypted) {
      if (!bundle.iv || !bundle.authTag) {
        throw new Error('Bundle claims to be encrypted but IV or authTag is missing');
      }
      data = this.decrypt(data, bundle.iv, bundle.authTag);
    }

    // Parse JSON
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * Generate a secure random password
   */
  generatePassword(length: number = 32): string {
    return randomBytes(length).toString('base64').slice(0, length);
  }
}

// Singleton instance
export const bundleSecurity = new ProjectBundleSecurity();
