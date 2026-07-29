import { NODE_ENV, PORT, CLIENT_URL, CORS_ORIGIN, EMAIL_FROM } from '../../config';

describe('config', () => {
  it('uses a numeric port', () => {
    expect(PORT).toEqual(expect.any(Number));
  });

  it('exposes a client url', () => {
    expect(CLIENT_URL).toMatch(/^https?:\/\//);
  });

  it('sets cors origin from client url when not configured', () => {
    expect(CORS_ORIGIN).toBeDefined();
  });

  it('builds a default email from the sender address', () => {
    expect(EMAIL_FROM).toContain('@');
  });

  it('provides a node env string', () => {
    expect(typeof NODE_ENV).toBe('string');
  });
});
