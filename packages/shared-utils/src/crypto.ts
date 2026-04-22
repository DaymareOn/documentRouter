import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn = '15m'
): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function generateRefreshToken(
  payload: Record<string, unknown>,
  secret: string
): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' } as jwt.SignOptions);
}

export function verifyToken(token: string, secret: string): Record<string, unknown> {
  return jwt.verify(token, secret) as Record<string, unknown>;
}

export function generateId(): string {
  return uuidv4();
}

export function generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  return nacl.box.keyPair();
}

export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { encrypted: Uint8Array; nonce: Uint8Array } {
  const messageUint8 = new TextEncoder().encode(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(messageUint8, nonce, recipientPublicKey, senderSecretKey);
  return { encrypted, nonce };
}

export function decryptMessage(
  encrypted: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string | null {
  const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey);
  if (!decrypted) return null;
  return new TextDecoder().decode(decrypted);
}
