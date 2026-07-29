import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('multer', () => {
  const actual = jest.requireActual('multer');
  return Object.assign((options: any) => ({ options }), actual, {
    diskStorage: jest.fn((cfg) => cfg),
  });
});

import { upload } from '../../middlewares/upload';

describe('upload middleware', () => {
  it('uses configured limits', () => {
    expect((upload as any).options.limits.fileSize).toBe(5 * 1024 * 1024);
  });

  it('accepts supported images', () => {
    const cb = jest.fn();
    (upload as any).options.fileFilter({}, { originalname: 'image.png', mimetype: 'image/png' }, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('rejects unsupported images', () => {
    const cb = jest.fn();
    (upload as any).options.fileFilter({}, { originalname: 'image.gif', mimetype: 'image/gif' }, cb);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('creates directories for the destination', () => {
    (fs.existsSync as unknown as jest.Mock).mockReturnValue(false);
    const mkdirSpy = fs.mkdirSync as unknown as jest.Mock;
    const cb = jest.fn();
    (upload as any).options.storage.destination({}, { fieldname: 'eventImage' }, cb);
    expect(mkdirSpy).toHaveBeenCalled();
  });
});
