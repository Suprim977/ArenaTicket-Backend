import { generateBookingRef } from '../../utils/bookingRef';

describe('booking ref', () => {
  it('generates the expected booking reference format', () => {
    expect(generateBookingRef()).toMatch(/^AT-\d{6}-[A-Z0-9]{2}$/);
  });

  it('generates a unique-looking prefix', () => {
    const ref = generateBookingRef();
    expect(ref.startsWith('AT-')).toBe(true);
  });
});
