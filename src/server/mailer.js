import nodemailer from 'nodemailer';
import { loadConfig } from './config.js';

let transporter;

/**
 * メール送信用トランスポーターを初期化する
 */
export function getTransporter() {
  if (transporter) return transporter;

  const config = loadConfig();

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  return transporter;
}

/**
 * メールを送信する
 */
export async function sendEmail(to, subject, htmlBody) {
  const config = loadConfig();
  const transport = getTransporter();

  const mailOptions = {
    from: `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`,
    to,
    subject,
    html: htmlBody,
  };

  return transport.sendMail(mailOptions);
}

/**
 * SMTP接続をテストする
 */
export async function testConnection() {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('SMTP接続テスト: 成功');
    return true;
  } catch (error) {
    console.error('SMTP接続テスト: 失敗 -', error.message);
    return false;
  }
}
