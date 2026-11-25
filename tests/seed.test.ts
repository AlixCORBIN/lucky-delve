import { describe, expect, it } from 'vitest';
import { parseSeed } from '../src/seed';

describe('graine', () => {
  it('lit les 16 lignes hexadécimales de random.org en 256 bits', () => {
    const body = ['f', 'a3', '1b2', 'ffff', ...Array(12).fill('0')].join('\n') + '\n';
    expect(parseSeed(body)).toBe('000f00a301b2ffff' + '0000'.repeat(12));
  });
  it('lit la réponse JSON de la fonction Supabase', () => {
    expect(parseSeed(JSON.stringify({ seed: 'AB'.repeat(32) }))).toBe('ab'.repeat(32));
  });
  it('refuse une réponse incomplète ou une page d’erreur', () => {
    expect(parseSeed('ff\nff\n')).toBeNull();
    expect(parseSeed('Error: You have used your quota')).toBeNull();
  });
});
