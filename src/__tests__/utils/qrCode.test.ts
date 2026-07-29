describe('qr code utils', () => {
  it('serializes the payload before generating a QR code', async () => {
    jest.resetModules();
    const toDataURL = jest.fn().mockResolvedValue('data-url');
    jest.doMock('qrcode', () => ({ toDataURL }));
    const QRCode = require('qrcode');
    const { generateQrCode } = require('../../utils/qrCode');
    await generateQrCode({ ticketId: 't1', bookingId: 'b1', token: 'token1' });
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      JSON.stringify({ ticketId: 't1', bookingId: 'b1', token: 'token1' }),
      expect.objectContaining({ errorCorrectionLevel: 'H', margin: 2, width: 400 }),
    );
  });

  it('returns a data url', async () => {
    jest.resetModules();
    const toDataURL = jest.fn().mockResolvedValue('data-url');
    jest.doMock('qrcode', () => ({ toDataURL }));
    const { generateQrCode } = require('../../utils/qrCode');
    await expect(generateQrCode({ ticketId: 't2', bookingId: 'b2', token: 'token2' })).resolves.toBe('data-url');
  });
});
