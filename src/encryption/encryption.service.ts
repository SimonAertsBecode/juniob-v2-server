import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const secretKey = this.config.getOrThrow<string>('ENCRYPTION_SECRET_KEY');
    // Key must be 32 bytes for AES-256
    this.key = Buffer.from(secretKey, 'hex');

    if (this.key.length !== 32) {
      throw new Error(
        'ENCRYPTION_SECRET_KEY must be 32 bytes (64 hex characters)',
      );
    }
  }

  /**
   * Encrypt a string value using AES-256-CBC
   * Returns format: "iv:encryptedData" (both base64 encoded)
   */
  encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return `${iv.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt a value encrypted with encrypt()
   * Expects format: "iv:encryptedData" (both base64 encoded)
   */
  decrypt(encryptedValue: string): string {
    const [ivBase64, encryptedBase64] = encryptedValue.split(':');

    if (!ivBase64 || !encryptedBase64) {
      throw new Error('Invalid encrypted value format');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
