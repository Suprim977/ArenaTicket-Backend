import nodemailer from 'nodemailer';
import { EMAIL_FROM, EMAIL_PASS, EMAIL_USER } from './index';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });
}
