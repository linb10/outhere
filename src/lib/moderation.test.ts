import { describe, expect, it } from 'vitest';
import { checkText } from './moderation';

describe('checkText', () => {
  it('allows normal event text and public place names', () => {
    expect(checkText('Pickup at Kissena Park courts, 5v5. Bring water.')).toBeNull();
    expect(checkText('Meet by the Unisphere at 10')).toBeNull();
  });
  it('blocks contact info and addresses', () => {
    expect(checkText('Text me 718-555-1234')).toMatch(/phone/i);
    expect(checkText('email me at kid@example.com')).toMatch(/email/i);
    expect(checkText('Come to 123 Main Street')).toMatch(/address/i);
    expect(checkText('Party at 45-12 Parsons Blvd')).toMatch(/address/i);
  });
  it('blocks profanity', () => {
    expect(checkText('this is shit')).toMatch(/language/i);
  });
});
