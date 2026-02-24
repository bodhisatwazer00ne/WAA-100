import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const hasUrl = !!env.smtp.url;
const hasService = !!env.smtp.service;
const hasHostConfig = !!env.smtp.host;
const hasAuth = !!env.smtp.user && !!env.smtp.pass;
const disabled = (!hasUrl && !hasService && !hasHostConfig) || !hasAuth;

const transporter = !disabled ? nodemailer.createTransport(
  hasUrl
    ? env.smtp.url
    : {
        ...(hasService ? { service: env.smtp.service } : {
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.secure,
        }),
        requireTLS: env.smtp.requireTls,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      },
) : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (!transporter) {
    throw new Error('Email disabled; SMTP not configured');
  }

  const info = await transporter.sendMail({
    from: env.smtp.from,
    ...options,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

export async function verifySmtpConnection() {
  if (!transporter) {
    return { ok: false, reason: 'SMTP not configured' };
  }
  try {
    await transporter.verify();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, reason: String(error) };
  }
}

