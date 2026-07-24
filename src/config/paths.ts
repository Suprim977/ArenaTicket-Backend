import path from 'path';

// Resolves to the repository root from both src/config and dist/config.
export const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
export const UPLOADS_ROOT = path.resolve(BACKEND_ROOT, 'uploads');
export const USER_UPLOADS_ROOT = path.resolve(UPLOADS_ROOT, 'users');
export const TOURNAMENT_UPLOADS_ROOT = path.resolve(UPLOADS_ROOT, 'tournaments');
