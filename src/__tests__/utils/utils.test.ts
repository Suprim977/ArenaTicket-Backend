import { sendSuccess } from '../../utils/response';

describe('utils', () => {
  it('formats success responses', () => {
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    sendSuccess(res, { ok: true }, 'Done', 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Done' }));
  });

  it('generates booking refs', () => {
    jest.resetModules();
    const crypto = require('crypto');
    jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
    jest.spyOn(crypto, 'randomBytes').mockReturnValue({ toString: () => 'ABCD' } as any);
    const { generateBookingRef } = require('../../utils/bookingRef');
    expect(generateBookingRef()).toBe('AT-123456-AB');
  });

  it('generates qr code data', async () => {
    jest.resetModules();
    const toDataURL = jest.fn().mockResolvedValue('qr-data');
    jest.doMock('qrcode', () => ({ toDataURL }));
    const { generateQrCode } = require('../../utils/qrCode');
    await expect(generateQrCode({ ticketId: '1', bookingId: '2', token: '3' })).resolves.toBe('qr-data');
  });
});
