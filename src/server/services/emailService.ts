import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const resendApiBase = env.resend.apiBaseUrl.replace(/\/+$/, '');
const resendEndpoint = `${resendApiBase}/emails`;
const hasResendConfig = !!env.resend.apiKey;
const resendFrom = env.resend.from || env.smtp.from;

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

async function sendViaResend(options: SendEmailOptions) {
  if (!resendFrom) {
    throw new Error('Resend configured but sender address is missing (set RESEND_FROM)');
  }

  const payload = {
    from: resendFrom,
    to: [options.to],
    subject: options.subject,
    ...(options.text ? { text: options.text } : {}),
    ...(options.html ? { html: options.html } : {}),
  };

  const response = await fetch(resendEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Resend send failed (${response.status}): ${raw}`);
  }

  let parsed: { id?: string } = {};
  try {
    parsed = JSON.parse(raw) as { id?: string };
  } catch {
    parsed = {};
  }

  return {
    messageId: parsed.id ?? '',
    accepted: [options.to],
    rejected: [],
    response: raw,
  };
}

export async function sendEmail(options: SendEmailOptions) {
  if (hasResendConfig) {
    return sendViaResend(options);
  }

  if (!transporter) {
    throw new Error('Email disabled; no provider configured');
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

export async function verifyEmailConnection() {
  if (hasResendConfig) {
    if (!resendFrom) {
      return {
        ok: false as const,
        provider: 'resend' as const,
        reason: 'Resend configured but RESEND_FROM/SMTP_FROM missing',
      };
    }
    return {
      ok: true as const,
      provider: 'resend' as const,
      detail: `endpoint ${resendEndpoint}`,
    };
  }

  if (!transporter) {
    return { ok: false as const, provider: 'none' as const, reason: 'No email provider configured' };
  }
  try {
    await transporter.verify();
    return { ok: true as const, provider: 'smtp' as const, detail: 'SMTP connection verified' };
  } catch (error) {
    return { ok: false as const, provider: 'smtp' as const, reason: String(error) };
  }
}

