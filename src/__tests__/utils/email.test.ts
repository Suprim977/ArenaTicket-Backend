import { EMAIL_FROM, EMAIL_PASS, EMAIL_USER } from '../../config';

describe('email config', () => {
  it('creates a gmail transport using configured credentials', async () => {
    jest.resetModules();
    jest.unmock('../../config/email');
    const createTransport = jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));
    jest.doMock('nodemailer', () => ({ createTransport }));
    const nodemailer = require('nodemailer');
    const { transporter } = await import('../../config/email');
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    expect(transporter).toBeDefined();
  });

  it('sends email using the configured from address', async () => {
    jest.resetModules();
    jest.unmock('../../config/email');
    const sendMail = jest.fn().mockResolvedValue(undefined);
    jest.doMock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail })) }));
    const { sendEmail, transporter } = await import('../../config/email');
    await sendEmail('to@example.com', 'Subject', '<p>Hello</p>');
    expect((transporter as any).sendMail).toHaveBeenCalledWith({
      from: EMAIL_FROM,
      to: 'to@example.com',
      subject: 'Subject',
      html: '<p>Hello</p>',
    });
  });
});
