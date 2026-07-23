import QRCode from 'qrcode';

export const generateQrCode = (bookingRef: string): Promise<string> =>
  QRCode.toDataURL(JSON.stringify({ bookingRef }), {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  });
