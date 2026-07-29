import path from 'path';
import { BACKEND_ROOT, UPLOADS_ROOT, USER_UPLOADS_ROOT, EVENT_UPLOADS_ROOT, TOURNAMENT_UPLOADS_ROOT } from '../../config/paths';

describe('paths config', () => {
  it('resolves backend root from src/config', () => {
    expect(BACKEND_ROOT).toBe(path.resolve(__dirname, '..', '..', '..'));
  });

  it('builds uploads root under backend root', () => {
    expect(UPLOADS_ROOT).toBe(path.resolve(BACKEND_ROOT, 'uploads'));
  });

  it('builds user upload root', () => {
    expect(USER_UPLOADS_ROOT).toBe(path.resolve(UPLOADS_ROOT, 'users'));
  });

  it('builds event upload root', () => {
    expect(EVENT_UPLOADS_ROOT).toBe(path.resolve(UPLOADS_ROOT, 'events'));
  });

  it('builds tournament upload root', () => {
    expect(TOURNAMENT_UPLOADS_ROOT).toBe(path.resolve(UPLOADS_ROOT, 'tournaments'));
  });
});
