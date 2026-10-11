import { apiClient } from './apiClient';

interface Challenge {
  challengeId: string;
  publicKey: string;
  expiresAt: string;
}

export interface SealedPassword {
  challengeId: string;
  encryptedPassword: string;
}

const toBytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

/**
 * Encrypts the password in the browser with the backend's one-time RSA key (RSA-OAEP, SHA-256), bound to the
 * challenge id. Over HTTPS this means the password never travels, nor shows in DevTools, in readable form, and a
 * copied payload is useless because the challenge works only once.
 */
export async function sealPassword(password: string): Promise<SealedPassword> {
  const challenge = await apiClient.get<Challenge>('/api/auth/challenge');
  const key = await crypto.subtle.importKey('spki', toBytes(challenge.publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const sealed = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key,
    new TextEncoder().encode(`${challenge.challengeId}:${password}`));
  return { challengeId: challenge.challengeId, encryptedPassword: toBase64(new Uint8Array(sealed)) };
}
