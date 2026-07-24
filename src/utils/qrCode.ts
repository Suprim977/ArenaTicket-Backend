import QRCode from 'qrcode';

export type TicketQrPayload = {
  ticketId: string;
  bookingId: string;
  token: string;
};

export const generateQrCode = (payload: TicketQrPayload): Promise<string> =>
  QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  });
