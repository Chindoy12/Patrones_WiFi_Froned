import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/apiClient';
import { sealPassword } from '../src/services/passwordCipher';

vi.mock('../src/services/apiClient', () => ({ apiClient: { get: vi.fn() } }));

const subtle = (globalThis.crypto?.subtle ?? webcrypto.subtle) as SubtleCrypto;
let privateKey: CryptoKey;

beforeAll(async () => {
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto);
  const pair = await subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['encrypt', 'decrypt']);
  privateKey = pair.privateKey;
  const spki = new Uint8Array(await subtle.exportKey('spki', pair.publicKey));
  vi.mocked(apiClient.get).mockResolvedValue({
    challengeId: 'c-123', publicKey: btoa(String.fromCharCode(...spki)), expiresAt: '2026-10-11T00:02:00Z',
  });
});

describe('sealPassword', () => {
  it('sends only the challenge and an unreadable payload', async () => {
    const sealed = await sealPassword('Redes#2026a');

    expect(sealed.challengeId).toBe('c-123');
    expect(sealed.encryptedPassword).not.toContain('Redes');
    expect(JSON.stringify(sealed)).not.toContain('Redes#2026a');
  });

  it('can only be opened with the server private key, bound to the challenge', async () => {
    const sealed = await sealPassword('Redes#2026ñ');
    const bytes = Uint8Array.from(atob(sealed.encryptedPassword), (c) => c.charCodeAt(0));
    const plain = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes);

    expect(new TextDecoder().decode(plain)).toBe('c-123:Redes#2026ñ');
  });

  it('produces a different payload every time for the same password', async () => {
    const first = await sealPassword('Redes#2026a');
    const second = await sealPassword('Redes#2026a');
    expect(first.encryptedPassword).not.toBe(second.encryptedPassword);
  });
});
